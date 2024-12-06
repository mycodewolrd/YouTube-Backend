import { app, PORT } from "./app.js";
import connectDB from "./db/index.js";

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on  Port : ${PORT}`);
    });
  })

  .catch((error) => {
    console.error(`MongoDB connection error: ${error}`);
  });
