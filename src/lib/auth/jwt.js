import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (user, extra = {}) => {
    return jwt.sign({ id: user._id, username: user.username, ...extra }, JWT_SECRET, { expiresIn: "3d" });
}

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}
