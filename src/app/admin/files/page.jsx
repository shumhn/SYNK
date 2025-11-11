import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";
import { getAuthUser } from "@/lib/auth/guard";
import FileBrowserClient from "@/components/admin/files/file-browser-client";
import { serializeForClient } from "@/lib/utils/serialize";

export default async function FilesPage({ searchParams }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  await connectToDatabase();

  const params = await searchParams;
  const search = params.q || "";
  const resourceType = params.type || "";
  const page = parseInt(params.page || "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  // Build query
  const query = { isDeleted: false, isArchived: false };
  
  if (search) {
    query.$or = [
      { filename: { $regex: search, $options: "i" } },
      { originalFilename: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }
  
  if (resourceType && resourceType !== "all") {
    query.resourceType = resourceType;
  }

  // Fetch files
  const [files, total] = await Promise.all([
    FileAsset.find(query)
      .populate("uploadedBy", "username email image")
      .populate("project", "title")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FileAsset.countDocuments(query),
  ]);

  // Calculate storage stats
  const stats = await FileAsset.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$resourceType",
        count: { $sum: 1 },
        totalSize: { $sum: "$size" },
      },
    },
  ]);

  const storageStats = {
    total: stats.reduce((acc, s) => acc + (s.totalSize || 0), 0),
    byType: stats.reduce((acc, s) => {
      acc[s._id || "unknown"] = {
        count: s.count,
        size: s.totalSize || 0,
      };
      return acc;
    }, {}),
  };

  return (
    <FileBrowserClient
      initialFiles={serializeForClient(files)}
      currentUser={serializeForClient(user)}
      pagination={{
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }}
      storageStats={storageStats}
      filters={{
        search,
        resourceType,
      }}
    />
  );
}
