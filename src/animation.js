import React from 'react';

export const WaterFall = (text) => {
    const textObj = [];
    const words = text.split(' ');
    //Split into letters and spaces
    for(let i=0;i<words.length;i++){
        const text = words[i].split('');
        for(let i=0;i<text.length;i++){
            textObj[textObj.length] = text[i];
        }
        textObj[textObj.length] = ' ';
    }
    //Map each letter in a seperate div
    const animated = textObj.map((letter, i)=>{
        const delayTime = 150*i;
        const animate = {
            width:letter===' '?5:null,
            animationDelay:delayTime+'ms'
        }
        return <div key={i} style={animate} className="waterfallText" id={"waterfallText_"+i}>{letter}</div>;
    });
    return <div id="waterfall-wrapper">{animated}</div>;
};