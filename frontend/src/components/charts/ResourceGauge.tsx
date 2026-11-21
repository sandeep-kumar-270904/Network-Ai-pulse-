import React from 'react';
import ReactECharts from 'echarts-for-react';

interface ResourceGaugeProps {
  title: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  color?: string;
}

export const ResourceGauge: React.FC<ResourceGaugeProps> = ({
  title,
  value,
  min = 0,
  max = 100,
  unit = '%',
  color = '#22D3EE',
}) => {
  const option = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min,
        max,
        splitNumber: 5,
        itemStyle: {
          color: color,
          shadowColor: color,
          shadowBlur: 8,
        },
        progress: {
          show: true,
          roundCap: true,
          width: 8,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 8,
            color: [[1, '#1A2F4A']],
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        title: {
          show: true,
          offsetCenter: [0, '75%'],
          fontSize: 11,
          color: '#91A7C0',
          fontFamily: 'Inter',
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '15%'],
          fontSize: 22,
          fontWeight: 'bold',
          formatter: `{value}${unit}`,
          color: '#EAF3FF',
          fontFamily: 'JetBrains Mono',
        },
        data: [
          {
            value: Number(value.toFixed(1)),
            name: title,
          },
        ],
      },
    ],
  };

  return (
    <div className="w-full h-44 flex items-center justify-center">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
};
