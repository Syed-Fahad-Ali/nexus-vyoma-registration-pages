import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
    isEntryTicket: {
        type: Boolean,
        default: true,
    },
    price: {
        type: Number,
        required: true,
    }
}, { timestamps: true });

const Package = mongoose.models.Package || mongoose.model("Package", packageSchema);

export default Package;