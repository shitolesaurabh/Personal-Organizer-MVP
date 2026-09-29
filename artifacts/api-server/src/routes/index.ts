import { Router, type IRouter } from "express";
import healthRouter from "./health";
import organizerRouter from "./organizer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(organizerRouter);

export default router;
