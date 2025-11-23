import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";
import Department from "@/models/Department";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

// GET all channels for current user
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // private, group, department
  const q = searchParams.get("q")?.trim();
  
  // Find channels where user is a member
  const filter = {
    members: auth.user._id,
    archived: { $ne: true },
    ...(type ? { type } : {}),
    ...(q ? { name: { $regex: q, $options: "i" } } : {}),
  };
  
  const channels = await Channel.find(filter)
    .populate("members", "username email image")
    .populate("departments", "name")
    .populate("lastMessage.author", "username image")
    .populate("createdBy", "username")
    .sort({ "lastMessage.createdAt": -1, createdAt: -1 })
    .lean();
  
  return NextResponse.json({ error: false, data: channels }, { status: 200 });
}

// CREATE new channel (private, group, or inter-department)
export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const body = await req.json();
  const { type, name, description, members, departments } = body;
  
  if (!type || !["private", "group", "department"].includes(type)) {
    return NextResponse.json({ error: true, message: "Invalid channel type" }, { status: 400 });
  }
  
  await connectToDatabase();
  
  let channelMembers = [];
  
  // For department channels, automatically fetch all members from selected departments
  if (type === "department") {
    if (!Array.isArray(departments) || departments.length < 2) {
      return NextResponse.json({ 
        error: true, 
        message: "Inter-department channels require at least 2 departments" 
      }, { status: 400 });
    }
    
    // Verify departments exist
    const deptCount = await Department.countDocuments({ _id: { $in: departments } });
    if (deptCount !== departments.length) {
      return NextResponse.json({ error: true, message: "One or more departments not found" }, { status: 400 });
    }
    
    // Fetch all users from these departments
    const users = await User.find({ department: { $in: departments } }).select("_id").lean();
    channelMembers = users.map(u => u._id.toString());
    
    // Always include the creator
    if (!channelMembers.includes(auth.user._id.toString())) {
      channelMembers.push(auth.user._id.toString());
    }
    
    if (channelMembers.length === 0) {
      return NextResponse.json({ 
        error: true, 
        message: "No members found in selected departments. Add users to these departments first." 
      }, { status: 400 });
    }
  } else {
    // For private and group channels, use provided members
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: true, message: "Members are required" }, { status: 400 });
    }
    channelMembers = members;
  }
  
  // For private channels, check if already exists
  if (type === "private") {
    if (channelMembers.length !== 2) {
      return NextResponse.json({ error: true, message: "Private channels must have exactly 2 members" }, { status: 400 });
    }
    
    // Check if private channel already exists between these two users
    const existing = await Channel.findOne({
      type: "private",
      members: { $all: channelMembers, $size: 2 }
    }).lean();
    
    if (existing) {
      return NextResponse.json({ error: false, data: existing }, { status: 200 });
    }
  }
  
  // For group/department channels, name is required
  if ((type === "group" || type === "department") && !name?.trim()) {
    return NextResponse.json({ error: true, message: "Name is required for group/department channels" }, { status: 400 });
  }
  
  // Ensure creator is in members
  const uniqueMembers = Array.from(new Set([...channelMembers, auth.user._id.toString()]));
  
  const channelData = {
    type,
    name: name?.trim() || null,
    description: description?.trim() || null,
    members: uniqueMembers,
    departments: type === "department" ? departments : [],
    createdBy: auth.user._id,
    unreadCount: {}
  };
  
  const created = await Channel.create(channelData);
  const populated = await Channel.findById(created._id)
    .populate("members", "username email image")
    .populate("departments", "name")
    .lean();
  
  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
