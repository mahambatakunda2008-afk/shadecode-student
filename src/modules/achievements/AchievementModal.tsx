"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RichAchievement } from "./achievements";
import { getRarityColor } from "./achievements";

export interface AchievementModalProps {
  open: boolean;
  achievements: RichAchievement[];
  onClose: () => void;
}

export function AchievementModal({
  open,
  achievements,
  onClose,
}: AchievementModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Achievement unlocked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            style={{
              background: "#111",
              borderRadius: "16px",
              padding: "24px",
              minWidth: "320px",
              maxWidth: "420px",
              color: "white",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 style={{ marginBottom: "16px" }}>Achievement Unlocked</h2>

            {achievements.map((achievement) => {
              const rarityColor = getRarityColor(achievement.rarity);

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    margin: "12px 0",
                    padding: "12px",
                    borderRadius: "12px",
                    border: `1px solid ${rarityColor}`,
                    boxShadow: `0 0 12px ${rarityColor}33`,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{achievement.title}</div>
                  <div style={{ opacity: 0.7, fontSize: "0.9rem" }}>
                    {achievement.description}
                  </div>

                  {achievement.rarity && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        marginTop: "6px",
                        color: rarityColor,
                      }}
                    >
                      {achievement.rarity.toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}

            <div style={{ marginTop: "16px", opacity: 0.6, fontSize: "0.85rem" }}>
              Momentum is building. Keep going.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementModal;
