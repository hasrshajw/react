import React from "react";

export default function Reports() {
  return (
    <div className="page">
      <h1>Reports</h1>
      <p>Generate and view your reports.</p>

      <div className="reports-card">
        <div className="report-row">
          <div>
            <strong>Monthly Report</strong>
            <span>August 2026</span>
          </div>

          <button>View Report</button>
        </div>

        <div className="report-row">
          <div>
            <strong>User Report</strong>
            <span>All users</span>
          </div>

          <button>View Report</button>
        </div>

        <div className="report-row">
          <div>
            <strong>Revenue Report</strong>
            <span>August 2026</span>
          </div>

          <button>View Report</button>
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

        .reports-card {
          margin-top: 30px;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 14px;
          overflow: hidden;
        }

        .report-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 24px;
          border-bottom: 1px solid #eee;
        }

        .report-row:last-child {
          border-bottom: none;
        }

        .report-row div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .report-row span {
          color: #888;
          font-size: 13px;
        }

        button {
          border: none;
          background: #111;
          color: #fff;
          padding: 9px 15px;
          border-radius: 7px;
          cursor: pointer;
        }

        button:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}
