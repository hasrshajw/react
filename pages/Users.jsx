import React from "react";

export default function Users() {
  return (
    <div className="page">
      <h1>Users</h1>
      <p>Manage your users here.</p>

      <div className="content-card">
        <h2>User Management</h2>

        <div className="table">
          <div className="row header">
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
          </div>

          <div className="row">
            <span>Harsha</span>
            <span>harsha@example.com</span>
            <span className="active">Active</span>
          </div>

          <div className="row">
            <span>Rahul</span>
            <span>rahul@example.com</span>
            <span className="active">Active</span>
          </div>

          <div className="row">
            <span>Priya</span>
            <span>priya@example.com</span>
            <span className="inactive">Inactive</span>
          </div>
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

        .content-card {
          margin-top: 30px;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 14px;
          padding: 24px;
        }

        .content-card h2 {
          margin-top: 0;
        }

        .row {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr;
          padding: 16px 10px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }

        .header {
          font-weight: 600;
          color: #777;
        }

        .active {
          color: #159447;
          font-weight: 600;
        }

        .inactive {
          color: #999;
        }
      `}</style>
    </div>
  );
}
