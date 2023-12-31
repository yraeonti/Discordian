import { NextApiRequest, NextApiResponse } from "next";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponseServerIo
) {
    if (req.method !== "POST") {
        return res.status(401).json({error: "Method not allowed"})
    }

    try {
        const profile = await currentProfilePages(req)

        const {content, fileUrl} = req.body

        const {serverId, channelId} = req.query

        if (!profile) {
            return res.status(400).json({error: "Unauthorized"})
        }

        if (!serverId) {
            return res.status(400).json({error: "Server ID missing "})
        }

        if (!channelId) {
            return res.status(400).json({error: "Channel ID missing "})
        }

        if (!content) {
            return res.status(400).json({error: "Content missing "})
        }

        const server = await db.server.findFirst({
            where: {
                id: serverId as string,
                members: {
                    some: {
                        profileId: profile.id
                    }
                }
            },
            include: {
                members: true
            }
        })

        if (!server) {
            return res.status(404).json("Server not found")
        }

        const channel = await db.channel.findFirst({
            where: {
                id: channelId as string,
                serverId: serverId as string
            }
        })

        if (!channel) {
            return res.status(404).json("Channel not found")
        }

        const member = server.members.find((member) => member.profileId === profile.id)

        // console.log(member);
        

        if (!member) {
            return res.status(404).json("Member not found")
        }

        const message = await db.message.create({
            data: {
                content,
                fieldUrl: fileUrl,
                channelId: channelId as string,
                memberId: member.id
            },
            include: {
                member: {
                    include: {
                        profile: true
                    }
                }
            }
        })

        const channelKey = `chat:${channelId}:messages`

        console.log('server addkey', channelKey);
        

        res?.socket?.server?.io?.emit(channelKey, message)

        // console.log(res?.socket?.server?.io);
        

        res.status(200).json(message)
    } catch (error) {
        console.log(error);
        
        
    }
}