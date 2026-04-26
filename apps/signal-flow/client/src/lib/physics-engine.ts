export class AudioPhysicsEngine {
  private totalLiability: number = 0;

  public validatePatch(from: EquipmentPort, to: EquipmentPort): string {
    // 1. Overload (Line -> Mic)
    if (from.outputLevel === SignalLevel.LINE && to.expectedLevel === SignalLevel.MIC) {
      this.totalLiability += 50;
      return "WARNING: OVERLOAD. Line signal into Mic input!";
    }

    // 2. Critical Failure (Speaker -> Line)
    if (from.outputLevel === SignalLevel.SPEAKER && to.expectedLevel !== SignalLevel.SPEAKER) {
      this.totalLiability += 500;
      return "CRITICAL FAILURE: INPUT BLOWN. Speaker signal destroyed the input stage.";
    }

    return "Patch successful.";
  }

  public getRepairBill(): number {
    return this.totalLiability;
  }
}