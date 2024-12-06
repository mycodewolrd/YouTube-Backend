
import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


//* Create a new user object from the database 
const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, " Password is required"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary URL
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    refreshToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

//* Aggregations
userSchema.plugin(mongooseAggregatePaginate);

//* Save and verify the Modification of given passwords
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//* Check if the user has changed their password
userSchema.methods.isPasswordCorrect = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    throw new Error("Password comparison failed.");
  }
};
//* generate Access Token 
userSchema.methods.generateAccessToken = function () {
   return jwt.sign({
        _id : this._id,
        userName : this.userName,
        email : this.email,
        fullName : this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn : process.env.ACCESS_TOKEN_EXPIRY}
)
};
//* generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({
       _id : this._id,
       
   },
   process.env.REFRESH_TOKEN_SECRET,
   {expiresIn : process.env.REFRESH_TOKEN_EXPIRY}
)
};

 const User = mongoose.model("User", userSchema);
 export default User;
