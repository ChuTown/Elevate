import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    senderRole: {
      type: String,
      enum: ["professional", "guest"],
      required: true,
    },
    senderName: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    guestId: { type: String, required: true, trim: true },
    guestName: { type: String, required: true, trim: true },
    messages: { type: [chatMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

conversationSchema.index({ professionalId: 1, guestId: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);
