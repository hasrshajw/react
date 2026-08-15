import React from "react";

export default function Analytics() {
  return (
    <div className="page">
      <h1>Analytics</h1>
      <p>View your performance and analytics.</p>

      <div className="analytics-grid">
        <div className="analytics-card">
          <span>Visitors</span>
          <strong>24,850</strong>
          <small>+12.5% this month</small>
        </div>

        <div className="analytics-card">
          <span>Conversion Rate</span>
          <strong>8.42%</strong>
          <small>+2.1% this month</small>
        </div>

        <div className="analytics-card">
          <span>Average Session</span>
          <strong>4m 32s</strong>
          <small>+8.4% this month</small>
        </div>
      </div>

      <div className="chart-placeholder">
        <h2>Performance Overview</h2>
        <div className="chart-area">
          Analytics Chart
        </div>
      </div>

      <style>{`
        .page {
          max-width: 1400px;
          margin: 0 auto;
        }

        h1 {
          margin: 0;
          font-size: 28px;
        }

        p {
          color: #777;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 30px;
        }

        .analytics-card,
        .chart-placeholder {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 14px;
          padding: 24px;
        }

        .analytics-card span {
          color: #777;
          font-size: 14px;
        }

        .analytics-card strong {
          display: block;
          margin: 12px 0 6px;
          font-size: 28px;
        }

        .analytics-card small {
          color: #159447;
        }

        .chart-placeholder {
          margin-top: 20px;
        }

        .chart-area {
          height: 300px;
          margin-top: 20px;
          border-radius: 10px;
          background: #f7f7f7;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
        }

        @media (max-width: 800px) {
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
