import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';

const app = express();


// Middleware
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
// Sample route
app.get('/', (req, res) => {
    res.send('Hello, HelpAround Backend!');
});



export default app;