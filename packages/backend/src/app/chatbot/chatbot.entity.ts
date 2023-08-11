import { BaseModelSchema, Chatbot, Project } from "@activepieces/shared";
import { EntitySchema } from "typeorm";
import { JSONB_COLUMN_TYPE } from "../database/database-common";

type ChatbotSchema = Chatbot &{
    project: Project
}

export const ChatbotEntity = new EntitySchema<ChatbotSchema>({
    name: 'chatbot',
    columns: {
        ...BaseModelSchema,
        displayName: {
            type: String,
        },
        projectId: {
            type: String,
        },
        settings: {
            type: JSONB_COLUMN_TYPE,
        },
    },
    relations: {
        project: {
            type: 'many-to-one',
            target: 'project',
            joinColumn: {
                name: 'projectId',
            },
        },
    },
});