import mongoose from "mongoose";
import { hash } from "bcrypt";

const UsersSchema = new mongoose.Schema({
    username : {
        type:String ,
        required:true, 
        unique:true,
         trim:true,
        lowercase:true,
    } , 

    email : {
        type:String ,
        required:true, 
        trim:true,
        lowercase:true,
        unique:true,
       match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    } , 
    password : {
        type:String ,
        required:true, 
         trim:true,
        lowercase:true,
    },

    }); 

    UsersSchema.pre("save", async function (next) {
        if (this.isModified("password")) {
            this.password = await hash(this.password, 10);
        }
        next();
    });


export default mongoose.model("User", UsersSchema);

