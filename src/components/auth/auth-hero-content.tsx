"use client";

import { FlipWords } from "ui/flip-words";

export default function AuthHeroContent({ description }: { description: string }) {
    console.log(description)
    return (
        <div className="w-full">
            <div className="text-left">
                {/* Main Heading */}
                <h1 className="text-xl md:text-6xl md:leading-16 tracking-tight font-light text-white mb-4">
                    <span className="font-medium italic instrument">AI Powered</span>{" "}
                    Tooling
                    <br />
                    <span className="font-light tracking-tight text-white">
                        for Databases
                    </span>
                </h1>

                {/* Description */}

                <div className="flex-1 text-lg font-light text-white mb-4 leading-relaxed" >
                    <FlipWords
                        words={[description]}
                        className=" mb-4 text-muted-foreground"
                    />
                </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 flex-wrap">
                <a href="https://github.com/ResilientEcosystem/ResAI/blob/main/README.md" className="px-8 py-3 rounded-full bg-transparent border border-white/30 text-white font-normal text-xs transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer">
                    Learn More
                </a>
                <a href="https://github.com/ResilientEcosystem/ResAI" className="px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer">
                    Code
                </a>
            </div>
        </div>
    );
}

