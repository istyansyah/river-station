#pragma once

#include <Arduino.h>

class WaterLevelCalculator {
 public:
  WaterLevelCalculator(float normalDistanceCm, float warningThresholdCm,
                       float dangerThresholdCm)
      : normalDistanceCm_(normalDistanceCm),
        warningThresholdCm_(warningThresholdCm),
        dangerThresholdCm_(dangerThresholdCm) {}

  bool calculate(float currentDistanceCm, float& waterLevelIncreaseCm) const {
    if (!isfinite(currentDistanceCm) || currentDistanceCm <= 0.0f ||
        currentDistanceCm > 500.0f || !isfinite(normalDistanceCm_) ||
        normalDistanceCm_ <= 0.0f) {
      return false;
    }

    waterLevelIncreaseCm = normalDistanceCm_ - currentDistanceCm;
    if (waterLevelIncreaseCm < 0.0f) {
      waterLevelIncreaseCm = 0.0f;
    }
    return isfinite(waterLevelIncreaseCm);
  }

  float normalDistanceCm() const { return normalDistanceCm_; }
  float warningThresholdCm() const { return warningThresholdCm_; }
  float dangerThresholdCm() const { return dangerThresholdCm_; }

 private:
  float normalDistanceCm_;
  float warningThresholdCm_;
  float dangerThresholdCm_;
};
