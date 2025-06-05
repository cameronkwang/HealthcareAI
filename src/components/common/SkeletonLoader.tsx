import React from 'react';

const SkeletonLoader: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-blue-100 animate-pulse">
    {/* Navbar skeleton */}
    <div className="h-16 w-full bg-white/60 backdrop-blur-md shadow-md mb-8" />
    {/* Hero skeleton */}
    <div className="max-w-4xl mx-auto mt-12 mb-8">
      <div className="h-12 w-2/3 bg-blue-200 rounded mb-4" />
      <div className="h-6 w-1/2 bg-blue-100 rounded mb-6" />
      <div className="h-12 w-40 bg-blue-300 rounded-xl" />
    </div>
    {/* Features skeleton */}
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-16">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-40 bg-blue-100 rounded-2xl" />
      ))}
    </div>
    {/* Stats skeleton */}
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-16">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-blue-50 rounded-2xl" />
      ))}
    </div>
    {/* Process skeleton */}
    <div className="max-w-5xl mx-auto flex flex-row gap-8 my-16">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-40 w-32 bg-blue-100 rounded-2xl" />
      ))}
    </div>
    {/* Portfolio skeleton */}
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-16">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-48 bg-blue-100 rounded-2xl" />
      ))}
    </div>
    {/* Testimonials skeleton */}
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-16">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-40 bg-white rounded-2xl" />
      ))}
    </div>
    {/* CTA skeleton */}
    <div className="max-w-2xl mx-auto text-center my-16">
      <div className="h-10 w-2/3 bg-blue-200 rounded mb-4 mx-auto" />
      <div className="h-6 w-1/2 bg-blue-100 rounded mb-6 mx-auto" />
      <div className="h-12 w-40 bg-blue-300 rounded-xl mx-auto" />
    </div>
  </div>
);

export default SkeletonLoader; 