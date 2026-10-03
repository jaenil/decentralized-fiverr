import express from "express";
import userRouter from "./routers/users";
import workerRouter from "./routers/workers";

const app = express();
app.use(express.json());

app.use("/v1/users",userRouter);
app.use("/v1/workers",workerRouter);

app.listen(3000);