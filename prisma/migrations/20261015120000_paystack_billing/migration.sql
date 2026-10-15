-- DropIndex
DROP INDEX "User_stripeCustomerId_key";

-- DropIndex
DROP INDEX "User_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "paystackCustomerCode" TEXT,
ADD COLUMN     "paystackEmailToken" TEXT,
ADD COLUMN     "paystackSubscriptionCode" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paystackCustomerCode_key" ON "User"("paystackCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_paystackSubscriptionCode_key" ON "User"("paystackSubscriptionCode");

