import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1] as string; // Splits "Bearer <token>"

    try {
        // 2. Verify the token using your environment secret
        const secret = process.env.JWT_SECRET as string;
        if (!secret) {
            throw new Error('JWT_SECRET is missing from environment variables.');
        }

        const decoded = jwt.verify(token, secret) as unknown as { id: number };

        if (decoded && decoded.id) {
            req.body = req.body || {};
            req.body.userId = decoded.id;
        } else {
            return res.status(403).json({ message: 'Invalid token payload.' });
        }

        // 4. Pass control to the next middleware or route handler
        return next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
}