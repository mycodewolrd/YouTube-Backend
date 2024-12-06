import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import { uploadCloudinary, deleteFormCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//* Generate the AccessToken and RefreshToken
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId); //find User form DB
    if (!user) {
      throw new ApiError("User not found");
    }
    const accessToken = user.generateAccessToken(); // generate Access Token
    const refreshToken = user.generateRefreshToken(); // generate Refresh Token
    //save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong generating access token and refresh token"
    );
  }
};

//* Register the User
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, password } = req.body;

  // Validate
  if (
    [fullName, userName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields must be required");
  }

  // check if user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{ fullName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists, please create a new one ...");
  }
  console.warn(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  // if (avatarLocalPath) {
  //   throw new ApiError(400, "Avatar File is missing");
  // } else if (coverLocalPath) {
  //   throw new ApiError(400, "CoverImage File is missing");
  // }

  // const avatar = await uploadCloudinary(avatarLocalPath);
  // let coverImage = "";
  // if (coverImage) {
  //   coverImage = await uploadCloudinary(coverLocalPath);
  // }

  let avatar;
  try {
    avatar = await uploadCloudinary(avatarLocalPath);
    console.log("Uploading avatar", avatar);
  } catch (error) {
    console.log("Error Uploading Avatar", error);
    throw new ApiError(500, "Failed to upload Avatar");
  }
  let coverImage;
  try {
    coverImage = await uploadCloudinary(coverLocalPath);
    console.log("Uploading coverImage", coverImage);
  } catch (error) {
    console.log("Error Uploading coverImage", error);
    throw new ApiError(500, "Failed to upload coverImage");
  }

  // create user object- create entry in db
  try {
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      userName: userName.toLowerCase(),
    });

    // check for user creation.... if created then
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken "
    );

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong when creating user");
    }

    // return response
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User created successfully"));
  } catch (error) {
    console.log("User creation Failed", error);
    if (avatar) {
      await deleteFormCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFormCloudinary(coverImage.public_id);
    }
    throw new ApiError(
      500,
      "Something went wrong when creating user and Images were Deleted"
    );
  }
});
//* User LogIn
const loginUser = asyncHandler(async (req, res) => {
  // 1) taking require DATA from req body
  const { email, password } = req.body;

  // 2) userName & email base LogIn access
  if (!email) {
    throw new ApiError(400, "email must be provided");
  }

  // 3) find the User
  const user = await User.findOne({
    $or: [{ email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate Password
  //! console.log(user[0].password);
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  // 5) access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  //Remove unwanted data (like token, password) while sending response
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new ApiError(404, " User already logged in ...");
  }

  // 6) send cookie and response
  const options = {
    httpOnly: true,
    secure: false,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, refreshToken, accessToken },
        " User Logged In Successfully"
      )
    );
});
//* User LogOut
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));

});

//* Validate the refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError("Refresh token is required");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is not valid");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "AccessToken Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong during refresh token generation process",
      error
    );
  }
});

//* Change the Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(500, "Password is not valid");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

//* Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user Details"));
});

//* Update User Details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName && !email) {
    throw new ApiError(500, " FullName and Email are required");
  }
  const user = await User.findOneAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details updated successfully"));
});

//* Update User Avatar 
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(501, "file is required");
  }
  const avatar = await uploadCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(501, "Something went wrong updated avatar");
  }
  const userAvatar = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, userAvatar, "Avatar updated successfully"));
});

//* Update User CoverImage
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(501, "CoverImage file is required");
  }
  const coverImage = await User.uploadCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(501, "CoverImage file is required");
  }
  const userCoverImage = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userCoverImage, "CoverImage is Successfully Updated")
    );
});
export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
