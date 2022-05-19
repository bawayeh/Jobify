import Jobs from "../models/Jobs.js";
import {StatusCodes} from 'http-status-codes';
import {BadRequestError,NotFoundError} from '../errors/index.js';
import checkPermissions from "../utils/checkPermission.js";
import mongoose from "mongoose";
import moment from "moment"

const createJob=async(req,res)=>{
    const {position,company}=req.body;

    if(!position || !company ){
        throw new BadRequestError('Please Provide All Values');
    }

    req.body.createdBy=req.user.userId;

    const job= await Jobs.create(req.body);
    res.status(StatusCodes.CREATED).json({job});
}
const getAllJob=async(req,res)=>{
    const {status,jobType,sort,search}=req.query

    let queryObject={
        createdBy:req.user.userId
    }
    // add stuff based on condition
    if(status!=='all'){
        queryObject.status=status;
    }

    if(jobType!=='all'){
        queryObject.jobType=jobType;
    }

    if(search){
        queryObject.position={$regex:search,$options:'i'}
    }

    //No await
    let result= Jobs.find(queryObject);


    if(sort ==='latest'){
        result=result.sort('-createdAt')
    }
    if(sort ==='oldest'){
        result=result.sort('createdAt')
    }
    if(sort ==='a-z'){
        result=result.sort('position')
    }
    if(sort ==='z-a'){
        result=result.sort('-position')
    }


    //Setup pagination 
    const page=Number(req.query.page)||1
    const limit=Number(req.query.limit)||10;
    const skip=(page-1)*limit;
    result=result.skip(skip).limit(limit);
    
    //chain sort
    const jobs=await result
    const totalJobs= await Jobs.countDocuments(queryObject);
    const numberOfPages= Math.ceil(totalJobs/limit)

  
    res.status(StatusCodes.OK).json({jobs,totalJobs,numberOfPages})
}
const updateJob=async(req,res)=>{
    const {id:jobId}=req.params;
    const {company,position}=req.body;
    
    if(!position || !company ){
        throw new BadRequestError('Please Provide All Values');
    }
    
    const job =await Jobs.findOne({_id:jobId});
    
    if(!job){
        throw new NotFoundError(`No job with id : ${jobId}`);
    }
    //check permission 
    checkPermissions(req.user,job.createdBy);
    
    const updatedJob=await Jobs.findOneAndUpdate({_id:jobId},req.body,{
        new:true,
        runValidators:true
    })
    
    res.status(StatusCodes.OK).json({updatedJob})
    
}

const deleteJob=async(req,res)=>{
    const {id:jobId}=req.params;

    const job =await Jobs.findById({_id:jobId});

    if(!job){
        throw new NotFoundError(`No job with id : ${jobId}`);
    }

    //check permission 
    checkPermissions(req.user,job.createdBy);


    await job.remove();


    res.status(StatusCodes.OK).json({msg:"Job deleted successfully"});

}

const showStats=async(req,res)=>{
    let stats=await Jobs.aggregate([
       {$match:{createdBy:mongoose.Types.ObjectId(req.user.userId)}},
       {$group:{_id:'$status',count:{$sum:1}}},
    //    {$group:{date:'$createdAt',count:{$sum:1}}}
    ])
    stats=stats.reduce((acc,curr)=>{
        const {_id:title,count} =curr;
        acc[title]=count;
        return acc;
    },{})

    let monthlyApplication=await Jobs.aggregate([
        {$match:{createdBy:mongoose.Types.
            ObjectId(req.user.userId)}},
        {$group:{_id:{
            year:{
                $year:'$createdAt'
            },
            month:{
                $month:'$createdAt'
            }
        },
        count:{$sum:1}
    },
    },
    {$sort :{'_id.year':-1,'_id.month':-1}},
    {$limit:6}
    ]);

    monthlyApplication=monthlyApplication.map((item)=>
    {
        const {_id:{year,month},count}= item
        const date=moment().month(month -1)
        .year(year).format('MMM Y')

        return {date,count}
    }).reverse();
 
    const defaultStats={
        decline:stats.decline||0,
        interview:stats.interview||0,
        pending:stats.pending||0
    }
    res.status(StatusCodes.OK).json({defaultStats,monthlyApplication})
}


export { 
    createJob,
    deleteJob,
    getAllJob,
    updateJob,
    showStats
}