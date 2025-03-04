import { string } from "joi";
import mongoose, { Model, Document, Schema } from "mongoose";

// Define the interface for the City document
export interface ICity extends Document {
  id: number; // Unique city ID
  name: string;
  state_id: number;
  // Reference to State
  state_name:string;
   district_name:string;
}

// Create the schema for the City model
const citySchema: Schema<ICity> = new Schema<ICity>(
  {
    id: { type: Number, unique: true }, // Unique city ID
    name: { type: String, required: true, unique: true }, // City name
    state_id: { type: Number, required: true }, // Reference to State
    state_name:{type:String,required:true},
    district_name:{type:String,required:true}
  },
  { timestamps: true }
);

// Create the model for the City schema
const City: Model<ICity> = mongoose.model<ICity>("City", citySchema);

export default City;
