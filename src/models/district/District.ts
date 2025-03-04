import mongoose, {Document,Model,Schema} from "mongoose";

export interface IDistrict extends Document{
    id:number;
    name:string;
    country_name:string;
    state_id:number;
}

const districtSchema: Schema<IDistrict> = new Schema<IDistrict>(
    {
        id:{type:Number,unique:true},
        name:{type:String,required:true,unique:true},
        state_id:{type:Number,unique:true},
        country_name:{type:String,unique:true}
    },
    { timestamps: true },
);
const District: Model<IDistrict> = mongoose.model<IDistrict>("District",districtSchema)
export default District;