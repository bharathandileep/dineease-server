import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDistrict extends Document {
    id: number;
    name: string;
    country_name: string;
    state_id: number;
}

const districtSchema: Schema<IDistrict> = new Schema<IDistrict>({
    id: { type: Number, unique: false },
    name: { type: String, required: true, unique: false },  
    state_id: { type: Number, required: true },  
    country_name: { type: String, required: true }  
}, { timestamps: true });

const District: Model<IDistrict> = mongoose.model<IDistrict>("District", districtSchema);
export default District;
