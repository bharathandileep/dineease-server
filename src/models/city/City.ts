import { string } from "joi";
import mongoose, { Model, Document, Schema } from "mongoose";

export interface ICity extends Document {
  id: number;
  name: string;
  state_id: number;
  
  state_name:string;
   district_name:string;
}

const citySchema: Schema<ICity> = new Schema<ICity>(
  {
    id: { type: Number, unique: true }, 
    name: { type: String, required: true, unique: true }, 
    state_id: { type: Number, required: true }, 
    state_name:{type:String,required:true},
    district_name:{type:String,required:true}
  },
  { timestamps: true }
);

const City: Model<ICity> = mongoose.model<ICity>("City", citySchema);

export default City;
