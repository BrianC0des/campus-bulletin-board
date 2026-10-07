import React from 'react';
import {useState} from 'react';

export default function Announcements() {
  const[searched, setSearched]=useState("");
  const[activeTab, setActiveTab]=useState("all");
  const filteredAnnouncements=announcements.filter((announcement)=>{


    return announcement.Tab===activeTab || activeTab=='all' 

    
  })
  return (
    <div>

      <div className="page-header">
        <h1 className="page-title">Announcements</h1>
      
        <button className="btn btn-primary">+ New Announcement</button>
      </div>

        <input type="text" placeholder='Search...' value={searched} onChange={(event)=>{setSearched(event.target.value)}}/>
          <button onClick={()=>{setActiveTab('all')}}>All</button>
          <button onClick={()=>{setActiveTab('active')}}>Active</button>
          <button onClick={()=>{setActiveTab('expired')}}>Expired</button>
          <button onClick={()=>{setActiveTab('scheduled')}}>Scheduled</button>

      <div className="card-grid">
        {/* TODO: AnnouncementCard items rendered here */}
      </div>

    </div>
  );
}
