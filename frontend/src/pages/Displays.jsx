import React from 'react';
import { useState } from "react";

function DisplayList ({ displays = [] }){

  return (
    <div className="DisplayTable">
      <div className="row DisplayHeader">
        <span></span>
        <span>Display Name</span>
        <span>Location</span>
        <span>Registration</span>
        <span>Actions</span>
      </div>
    </div>
  )
}

export default function Displays() {
  const [search, setSearch] = useState("");
  const [Filter, setFilter] = useState("all");

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px" }}>
        <h1 className="page-title">Display Management</h1>
        <button className="btn btn-primary">+ Pair New Display</button>
      </div>

      <div className="searchInput" >
        <input type="text" placeholder="Search displays..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="filter-container">
          <select value={Filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">ALL</option>
            <option value="registered">REGISTERED</option>
            <option value="unregistered">UNREGISTERED</option>
          </select>
        </div>
      </div>

      <div className="card-grid">
        <DisplayList/>
        {/* TODO: DisplayCard items rendered here */} 
      </div>
    </div>
  );
}