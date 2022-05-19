import express from "express"
const router=express.Router();

import {createJob,deleteJob,updateJob,getAllJob,showStats} from "../controllers/jobController.js"

router.route('/').post(createJob).get(getAllJob);
router.route('/stats').get(showStats);
router.route('/:id').delete(deleteJob).patch(updateJob);

export default router;