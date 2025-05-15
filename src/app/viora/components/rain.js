/**
 * 生成模拟雨量随时间变化的数据序列。
 * 每一个数据点包含时间戳和对应的雨量，模拟自然降雨中的强弱波动与节奏变化。
 *
 * @param {number} timelinePoints - 时间线上的雨滴事件总数（数据点数量）
 * @param {number} rainMax - 单次最大雨量（峰值）
 * @param {number} rainJitterRatio - 雨量扰动比例（如 0.3 表示最大雨量的±30%）
 * @param {number} intervalMin - 两个雨滴事件之间的最小间隔时间（毫秒）
 * @param {number} intervalMax - 最大间隔时间（毫秒）
 * @param {number} intervalJitterRatio - 间隔扰动比例（如 0.2 表示间隔时间的±20%）
 *
 * @returns {Array<{time: number, amount: number}>} 时间点组成的数组，每个点包含 time 和雨量 amount
 */
export function rainfallTimeline(
  timelinePoints = 100,
  rainMax = 50,
  rainJitterRatio = 0.3,
  intervalMin = 100,
  intervalMax = 1000,
  intervalJitterRatio = 0.2
) {
  const data = [];
  let time = 0;

  for (let i = 0; i < timelinePoints; i++) {
    const progress = i / (timelinePoints - 1); 
    const sineFactor = Math.pow(Math.sin(progress * Math.PI), 5);

    
    // 基础雨量曲线：由小到大再到小（正弦）
    const baseAmount = sineFactor * rainMax; // 0 → 1 → 0
    
    // 添加雨量扰动：让雨量不那么规律
    const rainJitter = (Math.random() * 2 - 1) * baseAmount * rainJitterRatio;
    let rainAmount = Math.max(0, baseAmount + rainJitter);
    rainAmount=rainAmount<5?(Math.floor(Math.random() * 5) + 1):rainAmount;

    // 基础间隔曲线：从长到短再到长（倒正弦）
    const intervalFactor = 1 -sineFactor; // 0 → 1 → 0 的倒转
    const rainInterval =
      intervalMin + intervalFactor * (intervalMax - intervalMin);
      
    // 添加间隔扰动
    const intervalJitter =
      (Math.random() * 2 - 1) * rainInterval * intervalJitterRatio;
    time += Math.max(0, rainInterval + intervalJitter);

    
    data.push({
      progress: progress, // 进度
      sineFactor: sineFactor, // 正弦因子
      time: time, // 毫秒
      amount: rainAmount, // 雨量
    });
  }

  return data;
}

export function rainBloom(
  rainData,
  width,
  height,
  maxRadius = 10,
  radiusJitterRatio = 0.3,
  maxGrowthRatio = 1.5,
  lifeTime,
  color = "rgb(0, 0, 0)"
) {
  const randIn = (max) => Math.random() * max;
  const minRadius = 3;
  const points = [];

    rainData.forEach(d => {
    // 基础雨点半径：由小到大再到小（正弦）
    const baseRadius = d.sineFactor * maxRadius;
      

    for (let i = 0; i < d.amount; i++) {
      // 添加半径扰动：让雨量不那么规律
      const radiusJitter = (Math.random() * 2 - 1) * baseRadius * radiusJitterRatio;
      let radius = Math.max(0, baseRadius + radiusJitter);
      radius = radius<minRadius?minRadius:radius;
      points.push({
        x: randIn(width),
        y: randIn(height),
        createAt: d.time, // 出现时间（毫秒）
        lifeTime: lifeTime, // 生存时长（用于控制透明度或大小衰减）
        radius: radius, // 半径
        maxGrowthRatio: maxGrowthRatio, // 涟漪增长比例
        color: color, // 可选
      });
    }
    });
  
  return points;
}
