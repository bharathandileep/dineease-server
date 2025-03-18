import { NextFunction, Request, Response } from "express";
import Kitchen from "../../models/kitchen/KitchenModel";
import Organization from "../../models/organisations/OrgModel";
import Collaboration from "../../models/collab/Collab"; // Ensure this import is correct

/**
 * Collaborate a Kitchen
 * Allows an organization to collaborate with a kitchen.
 */
export const collaborateKitchen = async (req: Request, res: Response):Promise<any> => {
    const { organization_id, kitchen_id, start_date, end_date } = req.body;
  
    try {
      const organization = await Organization.findById(organization_id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
  
      const kitchen = await Kitchen.findById(kitchen_id);
      if (!kitchen) {
        return res.status(404).json({ message: "Kitchen not found" });
      }
  
      const existingCollaboration = await Collaboration.findOne({ organization_id, kitchen_id });
      if (existingCollaboration) {
        return res.status(400).json({ message: "Collaboration already exists" });
      }
  
      const collaboration = new Collaboration({
        organization_id,
        kitchen_id,
        // start_date,
        // end_date,
        status: "Pending",
      });
  
      await collaboration.save();
  
      return res.status(201).json({
        message: "Collaboration request created successfully",
        collaboration,
      });
    } catch (error) {
       // Pass error to middleware
    }
  };
  

/**
 * List Collaborated Kitchens by Organization
 * Retrieves a list of kitchens that a particular organization has collaborated with.
 */
export const listCollaboratedKitchens = async (req: Request, res: Response):Promise<any> => {
  const { organization_id } = req.params;

  try {
    // Find all collaborations for the organization
    const collaborations = await Collaboration.find({ organization_id })
      .populate({
        path: "kitchen_id", // Populate the kitchen details
        select: "kitchen_name location contact_email", // Select specific fields to return
      })
      .exec();

    if (!collaborations || collaborations.length === 0) {
      return res.status(404).json({ message: "No collaborations found" });
    }

    // Extract the list of collaborated kitchens
    const collaboratedKitchens = collaborations.map((collab) => ({
      kitchen: collab.kitchen_id,
    //   start_date: collab.start_date,
    //   end_date: collab.end_date,
      status: collab.status,
    }));

    res.status(200).json({
      message: "Collaborated kitchens retrieved successfully",
      collaboratedKitchens,
    });
  } catch (error) {
    console.error("Error retrieving collaborated kitchens:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};