function xpRequiredForLevel(level) {
  if (level <= 1) return 800;
  if (level === 2) return 1000;
  if (level === 3) return 1200;
  if (level === 4) return 1500;
  return 1500 + (level - 4) * 300;
}

function getLevelProgress(totalXp) {
  let xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  let levelXpRequired = xpRequiredForLevel(level);

  while (xp >= levelXpRequired) {
    xp -= levelXpRequired;
    level += 1;
    levelXpRequired = xpRequiredForLevel(level);
  }

  const xpInLevel = xp;
  const progress = levelXpRequired ? Math.min(1, xpInLevel / levelXpRequired) : 0;

  return {
    level,
    xpInLevel,
    levelXpRequired,
    progress,
    totalXp: Math.max(0, Number(totalXp) || 0),
  };
}

export { xpRequiredForLevel, getLevelProgress };
