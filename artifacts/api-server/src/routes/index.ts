import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import moviesRouter from "./movies.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import reviewsRouter from "./reviews.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moviesRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/reviews", reviewsRouter);

export default router;
