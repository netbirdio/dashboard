import React from "react";
import Skeleton from "react-loading-skeleton";

export default function PricingTableSkeleton() {
  const numberOfSkeletons = 3;

  return (
    <div className="bg-nb-gray-950 p-6 text-white w-full">
      <h1 className="text-3xl font-bold mb-6">
        <Skeleton height={30} width={300}/>
      </h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(numberOfSkeletons)].map((_, index) => (
          <div key={index} className="flex flex-col p-6 rounded-lg shadow-lg max-w-sm bg-nb-gray-925 transition-colors">
            <div className="flex justify-center mb-4">
              <Skeleton height={20} width={100}/>
            </div>
            <Skeleton height={24} width={"30%"} className="mb-4"/>
            <div style={{ minHeight: "4em" }}>
              <Skeleton height={18} width={"90%"} className="mb-1"/>
              <Skeleton height={18} width={"90%"} className="mb-5"/>
            </div>
            <Skeleton height={42} width={"38%"} className="mb-2"/>
            <div className="flex-1">
              <ul className="mb-6" style={{ minHeight: "10em" }}>
                {[...Array(5)].map((_, featureIndex) => (
                  <li key={featureIndex} className="flex items-center mb-2">
                    <Skeleton circle={true} height={20} width={20} className="mr-2"/>
                    <Skeleton height={10} width={180}/>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto">
              <Skeleton height={40} width={"100%"}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
