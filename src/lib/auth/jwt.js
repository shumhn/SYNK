import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (user)=>{
    return jwt.sign({id : user._id , 
        username : user.username,
    }, JWT_SECRET, { expiresIn: "3d" });
}
