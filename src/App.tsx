import { useState } from "react";
import Datatable from "./components/Datatable/Datatable";
import type { THead } from "./components/Datatable/Datatable"; 

function App() {
  const [data, setData] = useState([
    ["John Doe", "true", "Active", "Admin"],
    ["Jane Smith", "false", "Inactive", "User"],
    ["Bob Johnson", "true", "Active", "Editor"],
    ["Alice Brown", "true", "Active", "Admin"],
    ["Charlie Wilson", "false", "Inactive", "User"],
    ["Diana Prince", "true", "Active", "Editor"],
    ["Ethan Hunt", "true", "Active", "Admin"],
    ["Fiona Gallagher", "false", "Inactive", "User"],
    ["George Costanza", "true", "Active", "Editor"],
    ["Hannah Baker", "false", "Inactive", "User"],
    ["Ian Malcolm", "true", "Active", "Admin"],
    ["Julia Roberts", "true", "Active", "Editor"],
    ["Kevin McCallister", "false", "Inactive", "User"],
    ["Laura Palmer", "true", "Active", "Admin"],
    ["Michael Scott", "true", "Active", "Editor"],
  ]);

  const headers: THead[] = [
    { name: "Name", type: "string" },
    { name: "Verified", type: "checkbox" },
    { name: "Status", type: "dropdown", options: ["Active", "Inactive"] },
    { name: "Role", type: "dropdown", options: ["Admin", "Editor", "User"] },
  ];

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newData = [...data];
    newData[rowIdx][colIdx] = value;
    setData(newData);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management Table</h1>
      <p className="text-gray-600 mb-4">Total Users: {data.length}</p>
      <Datatable
        theaders={headers}
        tbody={data}
        onCellChange={handleCellChange}
      />
    </div>
  );
}

export default App;