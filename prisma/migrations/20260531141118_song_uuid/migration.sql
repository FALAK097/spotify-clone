/*
  Warnings:

  - The primary key for the `LikedSong` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Song` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "LikedSong" DROP CONSTRAINT "LikedSong_songId_fkey";

-- AlterTable
ALTER TABLE "LikedSong" DROP CONSTRAINT "LikedSong_pkey",
ALTER COLUMN "songId" SET DATA TYPE TEXT,
ADD CONSTRAINT "LikedSong_pkey" PRIMARY KEY ("userId", "songId");

-- AlterTable
ALTER TABLE "Song" DROP CONSTRAINT "Song_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Song_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Song_id_seq";

-- AddForeignKey
ALTER TABLE "LikedSong" ADD CONSTRAINT "LikedSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
