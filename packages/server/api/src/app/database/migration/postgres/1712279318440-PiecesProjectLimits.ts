import { MigrationInterface, QueryRunner } from 'typeorm'
import { logger } from '@activepieces/server-shared'

export class PiecesProjectLimits1712279318440 implements MigrationInterface {
    name = 'PiecesProjectLimits1712279318440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        logger.info({
            name: 'PiecesProjectLimits1712279318440' },
        'up')
        await queryRunner.query(`
            ALTER TABLE "project_plan" RENAME COLUMN "flowPlanName" TO "name"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan" DROP COLUMN "stripeCustomerId"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan" DROP COLUMN "stripeSubscriptionId"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan" DROP COLUMN "subscriptionStartDatetime"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan" DROP COLUMN "tasksPerDay"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ADD "pieces" character varying array
        `)
        await queryRunner.query(`
            UPDATE "project_plan"
            SET "pieces" = ARRAY[]::varchar[]
        `)

        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ALTER COLUMN "pieces" SET NOT NULL;
        `)


        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ADD "piecesFilterType" character varying
        `)
        await queryRunner.query(`
            UPDATE "project_plan"
            SET "piecesFilterType" = 'NONE'
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ALTER COLUMN "piecesFilterType" SET NOT NULL
        `)

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "project_plan" RENAME COLUMN "name" TO "flowPlanName"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan" DROP COLUMN "piecesFilterType"
        `)
        await queryRunner.query(`
            DROP TYPE "public"."project_plan_piecesfiltertype_enum"
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan" DROP COLUMN "pieces"
        `)

        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ADD "tasksPerDay" integer
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ADD "subscriptionStartDatetime" TIMESTAMP WITH TIME ZONE NOT NULL
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ADD "stripeSubscriptionId" character varying
        `)
        await queryRunner.query(`
            ALTER TABLE "project_plan"
            ADD "stripeCustomerId" character varying
        `)
    }

}
