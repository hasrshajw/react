import React from "react";

export default function Dashboard() {
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard.</p>

      <div className="cards">
        <div className="card">
          <span>Total Users</span>
          <strong>1,250</strong>
        </div>

        <div className="card">
          <span>Revenue</span>
          <strong>₹84,500</strong>
        </div>

        <div className="card">
          <span>Orders</span>
          <strong>486</strong>
        </div>

        <div className="card">
          <span>Growth</span>
          <strong>+18.4%</strong>
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
          margin-top: 8px;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 30px;
        }

        .card {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 14px;
          padding: 24px;
        }

        .card span {
          display: block;
          color: #777;
          font-size: 14px;
        }

        .card strong {
          display: block;
          margin-top: 12px;
          font-size: 28px;
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
