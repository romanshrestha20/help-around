import express from 'express';
import cors from 'cors';


const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// Sample route
app.get('/', (req, res) => {
    res.send('Hello, HelpAround Backend!');
});



export default app;