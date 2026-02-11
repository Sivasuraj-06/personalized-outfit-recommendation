import React from "react";
import { SyncLoader } from "react-spinners";

const PageLoader = () => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SyncLoader />
    </div>
  );
};

export default PageLoader;
