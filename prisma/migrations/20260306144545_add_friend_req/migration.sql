-- DropForeignKey
ALTER TABLE "channels" DROP CONSTRAINT "channels_workspace_id_fkey";

-- AlterTable
ALTER TABLE "channels" ALTER COLUMN "workspace_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE SET NULL ON UPDATE CASCADE;
