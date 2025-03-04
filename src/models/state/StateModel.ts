import mongoose, { Document, Model, Schema } from "mongoose";

// Define the interface for the State document
export interface IState extends Document {
  id: number; // Unique state ID
  //state_id: number; // Another unique identifier (if needed)
  name: string;
  country_name: string; // Name of the country the state belongs to
  country_id:number
}

// Create the schema for the State model
  const stateSchema: Schema<IState> = new Schema<IState>(
    {
      id: { type: Number, unique: true }, // Unique state ID
      //state_id: { type: Number, unique: true }, // Another identifier (optional)
      name: { type: String, required: true, unique: true }, // State name
      country_id: { type: Number, required: true, unique: true }, // State name
      country_name: { type: String, required: true } // Country name reference
    },
    { timestamps: true }
  );

// Create the model for the State schema
const State: Model<IState> = mongoose.model<IState>("State", stateSchema);

export default State;
