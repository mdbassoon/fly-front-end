import React, { Fragment } from 'react';
import { WaterFall } from './animation.js';
import { saveAs } from 'file-saver';
import toolPic from './tools.png';

export default class App extends React.Component  {
  constructor(props) {
    super(props);
    const plasmidOptions = ["C terminal EGFP and SSPB tag","C terminal mDendra2 and SSPB tag","C terminal mScarlett and SSPB tag","N terminal EGFP and SSPB tag","N terminal mDendra2 and SSPB tag","N terminal mScarlett and SSPB tag"];
    url = 'http://142.93.118.6/api'; 
    this.state = {
      // Informational & API related
      url:url,
      results:null,
      fastaUrl:null,
      jbrowseUrl:null,
      extraBases:0,
      geneSections:null,
      fullGene:null,
      colorCode:null,
      startCodon:null,
      stopCodon:null,
      potentialTargets:null,
      primers:null,
      // Display
      width:null,
      height:null,
      mobile:false,
      statusMessage:null,
      geneName:'',
      geneTitle:null,
      targetSearch:null,
      pam:null,
      primerHighlight: [],
      subMenu:false,
      showTargetInfo:false,
      showPrimerInfo:false,
      target:null,
      allPrimers:false,
      mutatedPam:null,
      plasmidOptions:plasmidOptions,
      plasmidTemplate:null,
      frameShift:null
    }
    // API
    this.searchForGene = this.searchForGene.bind(this);
    this.getGeneInfo = this.getGeneInfo.bind(this);
    this.getMoreBases = this.getMoreBases.bind(this);
    this.searchForTargets = this.searchForTargets.bind(this);
    this.checkTargetEfficiency = this.checkTargetEfficiency.bind(this);
    this.selectTarget = this.selectTarget.bind(this);
    this.getOligos = this.getOligos.bind(this);
    this.getPrimers = this.getPrimers.bind(this);
    // Display
    this.changeGene = this.changeGene.bind(this);
    this.highlightPotentialTarget = this.highlightPotentialTarget.bind(this);
    this.clearHighlight = this.clearHighlight.bind(this);
    this.highlightTarget = this.highlightTarget.bind(this);
    this.stopHighlight = this.stopHighlight.bind(this); 
    this.highlightPrimer = this.highlightPrimer.bind(this);
    this.stopPrimerHighlight = this.stopPrimerHighlight.bind(this);
    this.selectPrimer = this.selectPrimer.bind(this);
    this.deselectPrimer = this.deselectPrimer.bind(this);
    this.setAppSize = this.setAppSize.bind(this);
    this.baseSelector = this.baseSelector.bind(this);
    this.fontSize = this.fontSize.bind(this);
    this.showTargetInfo = this.showTargetInfo.bind(this);
    this.showPrimerInfo = this.showPrimerInfo.bind(this);
    // Utilities
    this.revComp = this.revComp.bind(this);
    this.errorCheck = this.errorCheck.bind(this);
    this.saveDesign = this.saveDesign.bind(this);
    this.openDesign = this.openDesign.bind(this);
    this.showPamInput = this.showPamInput.bind(this);
    this.showPlasmidSelect = this.showPlasmidSelect.bind(this);
    this.mutatePam = this.mutatePam.bind(this);
    this.downloadPlasmid = this.downloadPlasmid.bind(this);
    this.downloadDesignApe = this.downloadDesignApe.bind(this);
    this.selectPlasmidTemplate = this.selectPlasmidTemplate.bind(this);
  }
  /****                 ****\

              API 
              
  \****                 ****/
  searchForGene(e) {
    if(e){e.preventDefault();}
    this.setState({results:null,fastaUrl:null,jbrowseUrl:null,statusMessage:'...Searching For Gene'}, ()=>{
      fetch(this.state.url+'?type=search&gene='+this.state.geneName).then(res =>{return res.json();}).then((res)=>{
        console.log('response',res);
        console.log(this.errorCheck(res));
        if(this.errorCheck(res)||res.code){
          this.setState({statusMessage:null},()=>{
            setTimeout(()=>{if(window.confirm('There was a problem connecting with flybase.org. Retry?')){
              this.searchForGene();
            }},400);
          });
          return false;
        }
        const fastaUrl = !res['fastaUrl']?'':res['fastaUrl'];
        const jbrowseUrl = !res['jbrowseUrl']?'':res['jbrowseUrl'];
        const geneTitle = !res['jbrowseUrl']?'':res['geneTitle'];
        this.setState({fastaUrl:fastaUrl,jbrowseUrl:jbrowseUrl,geneTitle:geneTitle,statusMessage:'...Retrieving DNA Sequence',retry:null});
        return true;
      }).then((bool)=>{
        console.log(bool);
        if(bool){this.getGeneInfo();}
      });
    });
  }
  getGeneInfo() {
    this.setState({statusMessage:'...Retrieving Gene Information'},()=>{
      const url = Buffer.from(this.state.fastaUrl.toString()).toString('base64');
      fetch(this.state.url+'?type=geneInfo&url='+url).then(res =>{return res.json();}).then((res)=>{
        console.log(res);
        if(this.errorCheck(res)||res.code){
          this.setState({statusMessage:null},()=>{
            setTimeout(()=>{if(window.confirm('There was a problem connecting with flybase.org. Retry?')){
              this.getGeneInfo();
            }},400);
          });
          return false;
        }
        const fullGene = res.fullGene;
        const geneSections = res.geneSections;
        const colorCode = res.colorCode;
        const sectionNames = res.sectionNames;
        let startCodon = null;
        let stopCodon = null;
        let startFrameI = 0;
        let codingRegions = {};
        for(let i=0;i<geneSections.length;i++){
          if(sectionNames[i]==='coding region'){
            codingRegions[i] = geneSections[i];
          }
        }
        const regions = Object.keys(codingRegions); 
        for(let i=0;i<regions.length;i++){
          const regionStr = codingRegions[regions[i]];
          const regionI = fullGene.search(regionStr); 
          let frameI = 0;
          for(let y=0;y<i;y++){
            frameI += frameI+codingRegions[regions[y]].length;
          }
          const startI = regionStr.search('ATG');  
          if(startI>-1) {
            if(!startCodon) {
              startCodon = regionI+startI; 
              startFrameI = frameI+startI;
              continue;
            } else if(startI+regionI<startCodon) {
              startCodon = regionI+startI;  
              startFrameI = frameI+startI;             
              continue;
            }
          }
          const tagArr = regionStr.match('TAG');
          const tgaArr = regionStr.match('TGA');
          const taaArr = regionStr.match('TAA');
          const frameShift = ((frameI-startFrameI)%3);
          for(let y=0;y<Math.floor(regionStr.length/3);y++) {
            const codon = regionStr.slice(y*3+frameShift,y*3+frameShift+3);
            if(tagArr&&codon==='TAG'){
              if(!stopCodon) {
                stopCodon = y*3+frameShift+regionI;
                break;
              } else if(y*3+regionI<stopCodon) {
                stopCodon = y*3+frameShift+regionI;
                break;
              }
            }
          }
          for(let y=0;y<regionStr.length/3;y++) {
            const codon = regionStr.slice(y*3+frameShift,y*3+frameShift+3);
            if(tgaArr&&codon==='TGA'){
              if(!stopCodon) {
                stopCodon = y*3+frameShift+regionI;
                break;
              } else if(y*3+regionI<stopCodon) {
                stopCodon = y*3+frameShift+regionI;
                break;
              }
            }
          }
          for(let y=0;y<regionStr.length/3;y++) {
            const codon = regionStr.slice(y*3+frameShift,y*3+frameShift+3);
            if(taaArr&&codon==='TAA'){
              if(!stopCodon) {
                stopCodon = y*3+frameShift+regionI;
                break;
              } else if(y*3+regionI<stopCodon) {
                stopCodon = y*3+frameShift+regionI;
                break;
              }
            }
          }
        }
        this.setState({
          geneSections:geneSections,
          fullGene:fullGene,
          colorCode:colorCode,
          sectionNames:sectionNames,
          startCodon:startCodon,
          stopCodon:stopCodon,
          statusMessage:null,
          pre:res.pre
        },()=>{return true});
      });
    });
  }
  getMoreBases(bases, callBack) {
    try{ 
      let extraBases = bases;
      this.setState({statusMessage:'Retrieving Additional Bases'}, ()=>{
        const url = Buffer.from(this.state.fastaUrl.toString()+'?padding='+extraBases).toString('base64');
        fetch(this.state.url+'?type=moreBases&url='+url).then(res =>{return res.json();}).then((res)=>{
          console.log(res);
          if(this.errorCheck(res)||res.code){
            this.setState({statusMessage:null},()=>{
              setTimeout(()=>{if(window.confirm('There was a problem connecting with flybase.org. Retry?')){
                this.getMoreBases();
              }},400);
            });
            return false;
          }
          const fullGene = res.fullGene;
          const geneSections = res.geneSections;
          const colorCode = res.colorCode;
          const sectionNames = res.sectionNames;

          this.setState({
            geneSections:geneSections,
            fullGene:fullGene,
            colorCode:colorCode,
            sectionNames:sectionNames,
            statusMessage:null,
            pre:res.pre,
            extraBases:bases
          },()=>{
          if(callBack){callBack()}
          return true
        });
        });
      });
    } catch(err) {
      console.log(err);
    }
  }
  searchForTargets(i, e) {
    if(e){e.preventDefault();}
    //i is index of middle of cut site
    const targetArea = this.state.fullGene.slice(i-100,i+100);

    this.setState({statusMessage:'...Finding Potential Targets'},()=>{
      fetch(this.state.url+'?type=targetSearch&targetArea='+targetArea).then(res =>{return res.json();}).then((res)=>{
        if(this.errorCheck(res)||res.code){
          this.setState({statusMessage:null},()=>{
            setTimeout(()=>{if(window.confirm('There was a problem connecting with http://targetfinder.flycrispr.neuro.brown.edu/. Retry?')){
              this.searchForTargets(i, e);
            }},400);
          });
          return false;
        }
        console.log(res.slice(0,5));
        this.setState({potentialTargets:res.slice(0,5)});
        return true;
      }).then((bool)=>{
        if(bool){
          if(!this.state.fullGene[i-1000]||!this.state.fullGene[i+1000]){
            this.getMoreBases(this.state.extraBases+1000,this.checkTargetEfficiency());
          } else {
            this.checkTargetEfficiency();
          }
        }
      });
    })
  }
  checkTargetEfficiency() {
    this.setState({statusMessage:'...Checking Target Efficiency Rates'},()=>{
      const targets = Buffer.from(JSON.stringify(this.state.potentialTargets)).toString('base64');
      fetch(this.state.url+'?type=targetEfficiency&targets='+targets).then(res =>{return res.json();}).then((res)=>{
        console.log(res);
        if(this.errorCheck(res)||res.code){
          this.setState({statusMessage:null},()=>{
            setTimeout(()=>{if(window.confirm('There was a problem connecting with http://www.flyrnai.org/evaluateCrispr/. Retry?')){
              this.checkTargetEfficiency();
            }},400);
          });
          return false;
        }
        let targetArr = res[0];
        for(let i=0;i<res.length;i++){
          if(res[i].score>targetArr.score){
            targetArr = res[i];
          }
        }
        this.setState({potentialTargets:res,statusMessage:null});
        return true;
      })
    })
  }
  selectTarget(target, targetI, e) {
    if(!this.state.highlightTarget){this.highlightTarget(targetI);}
    this.setState({potentialTargets:[this.state.potentialTargets[targetI]],target:target},()=>{
      this.getOligos();
    });
  }
  getOligos() {
    this.setState({statusMessage:'...Retrieving Oligos'},()=>{
      fetch(this.state.url+'?type=oligos&target='+this.state.target).then(res =>{return res.json();}).then((res)=>{
        if(this.errorCheck(res)||res.code){
          this.setState({statusMessage:null},()=>{
            setTimeout(()=>{if(window.confirm('There was a problem connecting with http://www.flyrnai.org/evaluateCrispr/. Retry?')){
              this.getOligos();
            }},400);
          });
          return false;
        }
        console.log(res);
        this.setState({oligos:[res[0],res[2]]});
        return true;
      }).then((bool)=>{
        if(bool){this.getPrimers();}
      });   
    });   
  }
  getPrimers() {

    const targetSearch = this.state.fullGene.search(this.state.potentialTargets[0].strand==='-'?this.revComp(this.state.target):this.state.target);

    const primerSections = {
      "5' Homology":this.state.fullGene.slice(targetSearch-1000, targetSearch-900),
      "5' Sequence":this.state.fullGene.slice(targetSearch-375, targetSearch-275),
      "3' Sequence":this.state.fullGene.slice(targetSearch+275, targetSearch+375),
      "3' Homology":this.state.fullGene.slice(targetSearch+900, targetSearch+1000)        
    }
    let primerSectionsString = Buffer.from(JSON.stringify(primerSections)).toString('base64');
    this.setState({statusMessage:'...Retrieving Potential Primers'},()=>{
      fetch(this.state.url+'?type=primers&primerSections='+primerSectionsString).then(res =>{return res.json();}).then((res)=>{
        console.log(res);
        if(this.errorCheck(res)||res.code){
          this.setState({statusMessage:null},()=>{
            setTimeout(()=>{if(window.confirm('There was a problem connecting with http://www.flyrnai.org/evaluateCrispr/. Retry?')){
              this.getPrimers();
            }},400);
          });
          return false;
        }
        this.setState({primers:res,statusMessage:null});
        return true;
      })
    });
  }
  /****                          ****\
   
        Form Controls and Display 

  \****                           ****/
  changeGene(e) {
    this.setState({geneName:e.target.value});
  }
  highlightPotentialTarget(i) {
    this.setState({ targetSearch: i });
  }
  clearHighlight() {
    this.setState({ targetSearch: null });
  }
  highlightTarget(i) {
    const target = this.state.potentialTargets[i].distal.toString()+this.state.potentialTargets[i].proximal.toString();
    const targetMatch = this.state.fullGene.toLowerCase().match(target.toLowerCase());
    const revMatch = this.state.fullGene.toLowerCase().match(this.revComp(target).toLowerCase());
    if(targetMatch) {
      this.setState({pam:targetMatch.index+20,highlightTarget:targetMatch.index});  
    } else if(revMatch) {
      this.setState({pam:revMatch.index-3,highlightTarget:revMatch.index});   
    }
  }
  stopHighlight() {
    this.setState({pam:null,highlightTarget:null});
  }
  selectPrimer(section, primer) {
    const primers = this.state.primers;
    let selected = !this.state.primers['selected']?{}:this.state.primers['selected'];
    selected[section] = primer;
    primers['selected'] = selected;
    this.highlightPrimer(primer[7]);
    if(Object.keys(primers['selected']).length === 4){
      this.setState({primers:primers,allPrimers:true});
    } else {
    this.setState({primers:primers});
    }
  }
  deselectPrimer(key) {
    const primers = this.state.primers;
    const primer = primers.selected[key];
    primers.selected[key] = null;
    this.setState({ primers: primers }, () => {
      this.stopPrimerHighlight(primer[7]);
    });
  }
  highlightPrimer(primer) {
    let primerI;
    const primerMatch = this.state.fullGene.toLowerCase().match(primer.toLowerCase());
    const revPrimerMatch = this.state.fullGene.toLowerCase().match(this.revComp(primer).toLowerCase());
    if(primerMatch){
      primerI = primerMatch.index;
    } else if(revPrimerMatch) {
      primerI = revPrimerMatch.index;
    }

    let highlights = this.state.primerHighlight;
    highlights.push(primerI)
    this.setState({primerHighlight:highlights});
  }
  stopPrimerHighlight(primer) {
    let primerI;
    const primerMatch = this.state.fullGene.toLowerCase().match(primer.toLowerCase());
    const revPrimerMatch = this.state.fullGene.toLowerCase().match(this.revComp(primer).toLowerCase());
    let highlights = this.state.primerHighlight;
    if(primerMatch) {
      primerI = primerMatch.index;
    } else if(revPrimerMatch) {
      primerI = revPrimerMatch.index;
    }
    for(let i=0;i<highlights.length;i++){
      if(highlights[i] === primerI) {
        highlights.splice(i,1);
      }
    }
    this.setState({primerHighlight:highlights});
  }
  setAppSize() {
    let width = 1080;
    let mobile = false;
    if(window.innerWidth<1080){
      width = window.innerWidth;
      mobile = true;
    }
    let height = window.innerHeight;
    this.setState({width:width,height:height,mobile:mobile});
  }
  subMenu(e, bool) {
    if(!bool)
    bool = !this.state.subMenu;
    this.setState({subMenu:bool});
  }
  baseSelector(e) {
    const bases = parseInt(e.target.value);
    if(bases !== this.state.extraBases) {
      this.getMoreBases(bases);
    }
  }
  fontSize(e) {
    this.setState({fontSize:parseInt(e.target.value)});
  }
  showTargetInfo() {
    this.setState({showTargetInfo:!this.state.showTargetInfo,showPrimerInfo:false});
  }
  showPrimerInfo() {
    this.setState({showPrimerInfo:!this.state.showPrimerInfo,showTargetInfo:false});
  }
  /****                             ****\
   
        Utilities & File Manipulation 

  \****                             ****/
  errorCheck(obj) {
    if(obj.code) {return 'ERROR: SERVER ERROR'}
    if(obj.error){return 'ERROR: '+obj.error}
    if(!Array.isArray(obj)&&!Object.keys(obj).length){
         return 'ERROR: Empty Object'
    } else if(Array.isArray(obj)&&!obj.length) {
      return 'ERROR: Empty Array'
    }
    return null;
  }
  revComp(dna) {
    let revComp = [];
    for(let i=0;i<dna.length;i++){
      if(dna[i]==='A'){revComp.push('T')} 
      else if(dna[i]==='C') {revComp.push('G')} 
      else if(dna[i]==='G') {revComp.push('C')}
      else if(dna[i]==='T') {revComp.push('A')}
      else if(dna[i]==='a') {revComp.push('t')} 
      else if(dna[i]==='c') {revComp.push('g')}
      else if(dna[i]==='g') {revComp.push('c')}
      else if(dna[i]==='t') {revComp.push('a')}
    }
    return revComp.reverse().join('');
  }
  saveDesign() {
    const design = JSON.stringify(this.state);
    var filename = this.state.geneName+".txt";
    var blob = new Blob([design], {
     type: "text/plain;charset=utf-8"
    });
    saveAs(blob, filename);
  }
  openDesign(e) {
    const reader = new FileReader();
    reader.onloadend = (res) => {
      const state = JSON.parse(res.target.result);
      if(!state.url){
        alert('Not A Valid File');
      }
      state.subMenu = false;
      this.setState(state,()=>{this.setAppSize()});
    };
    if(e.target.value.length) {
      reader.readAsText(e.target.files[0]);
    }
  }
  findPrimer(key) {
    let gene = this.state.fullGene;
    if(!this.state.primers['selected'][key]) {
      alert('Please Select Primers Before Downloading.');
    }
    const primer = gene.toLowerCase().match(this.state.primers['selected'][key][7].toLowerCase());
    const revPrimer = gene.toLowerCase().match(this.revComp(this.state.primers['selected'][key][7]).toLowerCase());
    let primerStart = 0;
    if(primer) {
      primerStart = primer.index;  
    } else if(revPrimer) {
      primerStart = revPrimer.index;
    }
    let primerStop = primerStart+this.state.primers[key][0][7].length;
    return {'start':primerStart+1,'stop':primerStop}
  }
  showPamInput() {
    const geneSections = this.state.geneSections;
    const sectionNames = this.state.sectionNames;
    let codingRegions = {};
    let frameShift = 0;
    for(let i=0;i<geneSections.length;i++){
      if(sectionNames[i]==='coding region'){
        codingRegions[i] = geneSections[i];
      }
    }
    const regions = Object.keys(codingRegions); 
    let cdStartCodon = null;
    let frameI = 0;
    for(let i=0;i<regions.length;i++){
      const regionStr = codingRegions[regions[i]];
      const regionI = this.state.fullGene.search(regionStr); 
      for(let y=0;y<i;y++){
        frameI += frameI+codingRegions[regions[y]].length;
      }
      const startI = regionStr.search('ATG');  
      if(startI>-1) {
        if(!cdStartCodon) {
          cdStartCodon = frameI+startI;
        } else if(startI+regionI<cdStartCodon) {
          cdStartCodon = frameI+startI;             
        }
      }
      const target = this.state.potentialTargets[0].distal+this.state.potentialTargets[0].proximal+this.state.potentialTargets[0].pam;
      const cdTargetI = regionStr.search(target);
      if(cdTargetI>-1) {
        frameShift = ((cdTargetI+frameI)-cdStartCodon)%3;
        break;
      } else {
        const revCdTargetI = regionStr.search(this.revComp(target));
        if(revCdTargetI>-1){
          frameShift = ((revCdTargetI+frameI)-cdStartCodon)%3;
          break;
        }
      }
    }
    this.setState({showPamInput:!this.state.showPamInput,showPlasmidSelect:false,frameShift:frameShift});
  }
  showPlasmidSelect() {
    this.setState({showPlasmidSelect:!this.state.showPlasmidSelect,plasmidTemplate:null});
  }
  mutatePam(e, str) {
    let pam;
    if(str){
      pam = e;
    } else {
      e.preventDefault();
      pam = e.target.children[0].value;
    }
    this.setState({mutatedPam:pam,showPamInput:false});
  }
  downloadDesignApe() {
    fetch(window.location.origin+'/fly_templates/empty_ape.txt').then((res)=>{return res.text();}).then((res)=>{
      const data = res;
      fetch(window.location.origin+'/fly_templates/feature.txt').then((res)=>{return res.text()}).then((res2)=>{
        const feature = res2;
        const newFeature = (loc, name, color) => {
          return feature
          .split('*featureLoc*').join(loc)
          .split('*featureName*').join(name)
          .split('*featureColor*').join(color);
        };
        let gene = this.state.fullGene;
        const target = this.state.potentialTargets[0].distal.toString()+this.state.potentialTargets[0].proximal.toString();
        const targetMatch = gene.toLowerCase().match(target.toLowerCase());
        const revTargetMatch = gene.toLowerCase().match(this.revComp(target.toLowerCase()));
        let targetI;
        if (targetMatch) {
          targetI = targetMatch.index+1;
        } else if (revTargetMatch) {
          targetI = revTargetMatch.index;
        }
        const pamStart = revTargetMatch?targetI-2:targetI+20;
        const start = parseInt(this.state.startCodon)+parseInt(this.state.extraBases)+1;
        const stop = parseInt(this.state.stopCodon)+parseInt(this.state.extraBases)+1; 
        gene = !this.state.mutatedPam?gene:gene.substr(0,pamStart-1)+this.state.mutatedPam+gene.substr(pamStart+2,gene.length);
        const featureArr = [
          newFeature(start+'..'+(start+2),'Start Codon','#df2935'),
          newFeature(stop+'..'+(stop+2),'Stop Codon','#df2935'),
          newFeature(this.findPrimer('hom5')['start']+'..'+this.findPrimer('hom5')['stop'],"5' Homology Arm",'#fdca40'),
          newFeature(this.findPrimer('hom3')['start']+'..'+this.findPrimer('hom3')['stop'],"3' Homology Arm",'#fdca40'),
          newFeature(this.findPrimer('seq5')['start']+'..'+this.findPrimer('seq5')['stop'],"5' Sequence Primer",'#fdca40'),
          newFeature(this.findPrimer('seq3')['start']+'..'+this.findPrimer('seq3')['stop'],"3' Sequence Primer",'#fdca40'),
          newFeature(targetI+'..'+(parseInt(targetI)+20),"Target",'#136F5E'),
          newFeature(pamStart+'..'+(parseInt(pamStart)+2),"Pam",'#42ED5E'),
        ];
        const makeGeneArr = () => {

          let geneArr = [];
          const spaces = (str) => {
            let spaceArr = [];
            for(let i=0;i<9-str.length;i++){
              spaceArr.push('');
            }
            return spaceArr;
          }
          for(let i=0;i<gene.length;){
            if(i%50===0){
              geneArr.push('\n');                  
            }
            if(i===0||i%50===0) {
              const currentNum = (i+1).toString();
              geneArr.push(spaces(i+1).join(' ')+(i+1)+' ');
            }
            if(i+10>gene.length){
              geneArr.push(gene.slice(i,gene.length));
            } else {
              geneArr.push(gene.slice(i,i+10));
            }
            geneArr.push('');
            i=i+10;
          }
          return geneArr.join(' ');
        }
        const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
        const date = new Date();
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const newData = data
        .split('*FEATURES*').join(featureArr.join(''))
        .split('*name*').join(this.state.geneName)
        .split('*length*').join(this.state.fullGene.length-this.state.geneSections[0].length)
        .split('*date*').join(day+'-'+month+'-'+year)
        .split('*GENE*').join(makeGeneArr())
        ;
        const design = newData;
        var filename = this.state.geneName+".ape";
        var blob = new Blob([design], {
         type: "text/plain;charset=utf-8"
        });
        saveAs(blob, filename);     
      });
    });
  }
  downloadPlasmid(e) {
    e.preventDefault();
    const url = (window.location.origin+'/plasmid_folder/')+(this.state.plasmidTemplate.split(' ').join('%20'))+'.txt';
    this.setState({showPlasmidSelect:false},()=>{
      fetch(url).then((res)=>{return res.text()}).then((data)=>{
        const preArm1 = data.split('**arm_1_start**')[0];
        const targetSearch = this.state.fullGene.search(this.state.potentialTargets[0].strand==='-'?this.revComp(this.state.target):this.state.target);
        let arm1 = this.state.fullGene.slice(targetSearch-1000, targetSearch);
        const postArm1 = data.split('**arm_1_end**')[1].split('**arm_2_start**')[0];
        let arm2 = this.state.fullGene.slice(targetSearch, targetSearch+1000);
        const postArm2 = data.split('**arm_2_end**')[1];
        
        if(this.state.mutatedPam) {
          const strand = this.state.potentialTargets[0].strand;
          const target = strand==='-'?this.revComp(this.state.target):this.state.target;
          let arms = arm1+arm2;
          const targetI = arms.toLowerCase().match(target.toLowerCase());
          if(strand==='-'){
            arms = arms.substr(0,targetI.index)+this.state.mutatedPam+arms.substr(targetI.index+3,arms.length);
          } else {
            arms = arms.substr(0,targetI.index+target.length-3)+this.state.mutatedPam+arms.substr(targetI.index+target.length,arms.length);
          }
          arm1 = arms.slice(0,Math.floor(arms.length/2)+1);
          arm2 = arms.slice(Math.floor(arms.length/2),arms.length);
        }
        let replaceArm1 = data.split('**arm_1_start**')[1].split('**arm_1_end**')[0].split('');
        let arm1I = 0;
        let replaceArm2 = data.split('**arm_2_start**')[1].split('**arm_2_end**')[0].split('');
        let arm2I = 0;


        for(let y=0;y<replaceArm1.length;y++) {
          if(replaceArm1[y]===' '||replaceArm1[y]==='\n'||!isNaN(replaceArm1[y])) {
          } else {
            replaceArm1[y] = arm1[arm1I];
            arm1I++;
          }

        }
        for(let y=0;y<replaceArm2.length;y++) {
          if(replaceArm2[y]===' '||replaceArm2[y]==='\n'||!isNaN(replaceArm2[y])) {
          } else {
            replaceArm2[y] = arm2[arm2I];
            arm2I++;
          }
          
        }

        let newData = preArm1 + replaceArm1.join('') + postArm1 + replaceArm2.join('') + postArm2;
        const design = newData;
        var filename = this.state.plasmidTemplate+" for "+this.state.geneName+".ape";
        var blob = new Blob([design], {
         type: "text/plain;charset=utf-8"
        });
        saveAs(blob, filename);  
      });
    });
  }
  selectPlasmidTemplate(e) {
    this.setState({plasmidTemplate:e.target.value});
  }


  /*--  Lifecycle      --*/

  componentDidMount(){
    this.setAppSize();
    window.addEventListener('resize', this.setAppSize);
  }
  render() {
    //General
    const statusMessage = !this.state.statusMessage?null:typeof this.state.statusMessage!='string'?this.state.statusMessage:WaterFall(this.state.statusMessage);
    const title = !this.state.geneTitle?'Fly Cypher':this.state.geneTitle;
    const mobile = this.state.width<600?true:false;
    // Landing
    const geneNameForm = <Fragment>
        <form id='gene-name'  onSubmit={this.searchForGene.bind(this)}>
          <input  value={this.state.geneName} onChange={this.changeGene.bind(this)} type='text' />
          <input  type="submit" value="Search" />
        </form>
      </Fragment>;
    const targetList = () => {
      if(!this.state.potentialTargets){
        return null;
      } else {
        const potentialTargets = this.state.potentialTargets;
        let targetList = [];
        let onTargetList = [];
        for(let i=0;i<potentialTargets.length;i++) {
          const offTarget = potentialTargets[i].offTarget;
          const distal = potentialTargets[i].distal;
          const proximal = potentialTargets[i].proximal;
          const pam = potentialTargets[i].pam;
          const strand = potentialTargets[i].strand;
          const score = !potentialTargets[i].score?'':potentialTargets[i].score;
          const targetHtml = 
          <li className='single-target' onClick={this.selectTarget.bind(this, distal+proximal+pam, i)} onMouseEnter={this.highlightTarget.bind(this, i)} onMouseLeave={potentialTargets.length>1?this.stopHighlight.bind(this, i):null} key={i}>
            <div className='target-wrapper'>
              <div style={{wordBreak:'break-all'}} className='target-gene-list'>Target Site:   
                <div style={{marginLeft:'6px',display:'inline-block',verticalAlign:'top',maxWidth:(this.state.width<210?this.state.width:210)+'px'}}>
                  <b><span>{distal}</span><span>{proximal}</span><span>{pam}</span></b></div>
                </div>
              <div style={{}}>Efficiency Score: <b>{score}</b></div>
              <div><ul style={{}}><li>Strand: <b>{strand}</b></li><li>Off Targets: <b>{offTarget}</b></li></ul></div>
            </div>
          </li>
          targetList.push(targetHtml);
          onTargetList.push(offTarget<1?targetHtml:null);
        }
        const listStyle= {
          height:'100%',
          overflowY:'auto',

        }
        if(!this.state.expandedTargetList){
          return <ul className='target-list' style={listStyle}>{onTargetList}</ul>
        } else {
          return <ul className='target-list' style={listStyle}>{targetList}</ul>
        }
      }
    }
    const primerList = () => {
      if(Object.keys(this.state.primers).length<4){
        if(!this.state.primerMessage){
          return null;    
        }
      }
      const primers = this.state.primers;
      const primerKeys = Object.keys(primers);
      let primerSections = [];
      for(let i=0;i<primerKeys.length;i++) {
        let section = primers[primerKeys[i]];
        const key = primerKeys[i];

        let singleList = () => {
          let singleList = [];
          let singlePrimers;
          if(!this.state.primers['selected']||!this.state.primers['selected'][key]){
            for(let i=0;i<section.length;i++) {
              singlePrimers = section[i];
              singleList.push(<li onClick={this.selectPrimer.bind(this, key, singlePrimers)} style={{padding:'20px 0px',display:'flex',flexDirection:'column',borderBottom:'1px solid #333',cursor:'pointer'}} onMouseEnter={this.highlightPrimer.bind(this, singlePrimers[7])} onMouseLeave={this.stopPrimerHighlight.bind(this, singlePrimers[7])} key={primerKeys[i]}>
                <div style={{display:'flex',marginLeft:'20px'}}>{singlePrimers[7]}</div>
                <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>tm: </div><div>{singlePrimers[3]}</div></div>
                <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>gc%: </div><div>{singlePrimers[4]}</div></div> 
                <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>any (Self Complementarity): </div><div>{singlePrimers[5]}</div></div>
                <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>3' (Self Complementarity): </div><div>{singlePrimers[6]}</div></div>
              </li>);
            }
          } else {
            singlePrimers = this.state.primers['selected'][key];
            singleList.push(<li style={{padding:'20px 0px',display:'flex',flexDirection:'column',borderBottom:'1px solid #333',cursor:'initial'}}>
              <div style={{display:'flex',marginLeft:'20px'}}>{singlePrimers[7]}</div>
              <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>tm: </div><div>{singlePrimers[3]}</div></div>
              <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>gc%: </div><div>{singlePrimers[4]}</div></div> 
              <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>any (Self Complementarity): </div><div>{singlePrimers[5]}</div></div>
              <div style={{display:'flex',marginLeft:'20px'}}><div style={{marginRight:'10px'}}>3' (Self Complementarity): </div><div>{singlePrimers[6]}</div></div>
            </li>);
          }
          return <Fragment>
            {singleList}
          </Fragment>;
        }
        const primerTitle = primerKeys[i]==='hom5'?"5' Homology Primers":primerKeys[i]==='hom3'?"3' Homology Primers":primerKeys[i]==='seq5'?"5' Sequence Primers":"3' Sequence Primers";
        if(key!=='selected'){
          primerSections.push(<ul className={primerKeys[i]} key={primerKeys[i]}>
            <li style={{padding:'10px 0px',color:!this.state.primers['selected']?'#333':!this.state.primers['selected'][key]?'#333':'#fff',fontWeight:'bold',background:!this.state.primers['selected']?'#efefef':!this.state.primers['selected'][key]?'#efefef':'#333',textAlign:'center',cursor:!this.state.primers['selected']?'initial':!this.state.primers['selected'][key]?'initial':'pointer'}} onClick={!this.state.primers['selected']?null:!this.state.primers['selected'][key]?null:this.deselectPrimer.bind(this, key)}>{primerTitle}</li>
            {singleList()}
          </ul>);
        }
      }
      return <div style={{height:'100%'}}>{primerSections}</div>;
    }
    const markedUpGene = () => {
      if(!this.state.fullGene) {return null}
      else {
        const info = <span>{this.state.pre}</span>;        
        let completeGene = [];
        for(let i=0;i<this.state.fullGene.length;i++) {
          completeGene.push(
            <span 
            key={i}
            onMouseEnter={this.highlightPotentialTarget.bind(this, i)}
            onMouseLeave={this.clearHighlight.bind(this)}
            onClick={this.state.potentialTargets?null:this.searchForTargets.bind(this, i)}>
            {this.state.fullGene[i]}
          </span>
          );
        }
        const highlightTargetSearch = () => {
          if(!this.state.targetSearch||this.state.potentialTargets) {return null} else {
            const pre = this.state.targetSearch>100?<span>{this.state.fullGene.slice(0, this.state.targetSearch-100)}</span>:null;
            const pretarget = this.state.targetSearch>100?<span style={{background:'rgba(19,111,99,0.3)'}}>{this.state.fullGene.slice(this.state.targetSearch-100, this.state.targetSearch)}</span>:<span style={{background:'rgba(19,111,99,0.3)'}}>{this.state.fullGene.slice(0, this.state.targetSearch)}</span>
            const target = <span style={{background:'red'}}>{this.state.fullGene.slice(this.state.targetSearch, this.state.targetSearch+1)}</span>
            const posttarget = this.state.targetSearch+100<this.state.fullGene.length?<span style={{background:'rgba(19,111,99,0.3)'}}>{this.state.fullGene.slice(this.state.targetSearch+1, this.state.targetSearch+100)}</span>:<span style={{background:'rgba(19,111,99,0.3)'}}>{this.state.fullGene.slice(this.state.targetSearch+1, this.state.fullGene.length)}</span>
            const post = this.state.targetSearch+100<this.state.fullGene.length?<span>{this.state.fullGene.slice(this.state.targetSearch+100,this.state.fullGene.length)}</span>:null;
            return <span>
              {info}
              {pre}
              {pretarget}
              {target}
              {posttarget}
              {post}
            </span>
          }
        }
        let allGenes = [];
        for(let i=0;i<this.state.geneSections.length;i++){
          allGenes.push(<span 
              key={i}
              className={this.state.colorCode[i]==='rgb(55,114,255)'?'coding-region':'non-coding-region'}
              //onClick={this.state.colorCode[i]==='rgb(55,114,255)'?this.searchForTargets.bind(this, i):null}
              style={{color:this.state.colorCode[i]}}>
              {this.state.geneSections[i]}
            </span>);
        }
        const pamHighlight = () => {

          const pre = <span>{this.state.fullGene.slice(0, this.state.pam)}</span>;
          const pam = <span style={{background:'rgba(66, 237, 94,0.6)'}}>{this.state.fullGene.slice(this.state.pam, this.state.pam+3)}</span>
          const post = <span>{this.state.fullGene.slice(this.state.pam+3,this.state.fullGene.length)}</span>;
          return !this.state.pam?null:this.state.pam===-1?null:<Fragment>
            {info}
            {pre}
            {pam}
            {post}
          </Fragment>
        }
        const highlightTargetGene = () => {
          if(!this.state.highlightTarget||this.state.highlightTarget===-1) {return null} else {
            const pre = <span>{this.state.fullGene.slice(0, this.state.highlightTarget)}</span>;
            const target = <span style={{background:'rgba(19,111,99,0.6)'}}>{this.state.fullGene.slice(this.state.highlightTarget, this.state.highlightTarget+20)}</span>
            const post = <span>{this.state.fullGene.slice(this.state.highlightTarget+20,this.state.fullGene.length)}</span>;
            return <Fragment>
              {info}
              {pre}
              {target}
              {post}
            </Fragment>
          }
        }
        const highlightCodons = () => {
          const startIndex = this.state.startCodon+this.state.extraBases;
          const stopIndex = this.state.stopCodon+this.state.extraBases;
          const pre = this.state.fullGene.slice(0,startIndex);
          const start = this.state.fullGene.slice(startIndex,startIndex+3);
          const postStart = this.state.fullGene.slice(startIndex+3,stopIndex);
          const stop = this.state.fullGene.slice(stopIndex,stopIndex+3);
          return <Fragment>
            {info}
            <span>{pre}</span>
            <span style={{background:'#df2935'}}>{start}</span>
            <span>{postStart}</span>
            <span style={{background:'#df2935'}}>{stop}</span>
          </Fragment>
        }

        const geneStyle = {
          padding:!mobile?'10px 20px':'10px 15px 30px',
          position:'absolute',
          top:1,left:-1,
          background:'rba(0,0,0,0)',
          letterSpacing:'4px',
          fontWeight:600,
          color:'rgba(55,55,55,0)',
          width:(!mobile?Math.floor(this.state.width*(2/3))-40:window.innerWidth-30)+'px',
          cursor:'pointer',
          textShadow:'none'
        }
        const geneStyle2 = {
          padding:!mobile?'10px 20px':'10px 15px 30px',
          position:'absolute',
          top:0,left:0,
          background:'rba(0,0,0,0)',
          letterSpacing:'4px',
          fontWeight:600,
          width:(!mobile?Math.floor(this.state.width*(2/3))-40:window.innerWidth-30)+'px',
        }
        const geneStyle3 = {
          padding:!mobile?'10px 20px':'10px 30px',
          position:'absolute',
          top:1,left:-1,
          background:'rba(0,0,0,0)',
          letterSpacing:'4px',
          color:'rgba(55,55,55,0)',
          textShadow:'none',
          fontWeight:600,
          width:(!mobile?Math.floor(this.state.width*(2/3))-40:window.innerWidth-30)+'px',
          cursor:'default',
        }
        const primerHighlighter = () => {
          if(!this.state.primerHighlight) {return null} else {
            let highlightArr = [];
            for(let i=0;i<this.state.primerHighlight.length;i++) {
              if(this.state.primerHighlight[i]>0){
              const pre = <span>{this.state.fullGene.slice(0, this.state.primerHighlight[i])}</span>;
              const target = <span style={{background:'#fdca40'}}>{this.state.fullGene.slice(this.state.primerHighlight[i], this.state.primerHighlight[i]+20)}</span>
              const post = <span>{this.state.fullGene.slice(this.state.primerHighlight[i]+20,this.state.fullGene.length)}</span>;
              highlightArr.push(<div className='primer-highlighter' style={geneStyle}>
                {info}
                {pre}
                {target}
                {post}
              </div>);
              }
            }
            return highlightArr;
          }
        }
        return <Fragment>
          <div style={geneStyle}>{(highlightCodons())}</div>
          {primerHighlighter()}
          <div style={geneStyle}>{pamHighlight()}</div>
          <div style={geneStyle}>{highlightTargetGene()}</div>
          <div style={geneStyle}>{highlightTargetSearch()}</div>
          <div className='gene-container' style={geneStyle2}>{info}{allGenes}</div>
          <div className='target-search' style={!this.state.potentialTargets?geneStyle:geneStyle3}>{info}{completeGene}</div>
         </Fragment>;
        }
    }
    const gene = <div style={{display:'inline-block',width:(!mobile?Math.floor(this.state.width*(2/3)):window.innerWidth)+'px',textAlign:'left',height:!mobile?this.state.height-204:'auto',}}> 
      <div style={{fontSize:this.state.fontSize+'px',textAlign:'left',position:'relative',display:'block',wordBreak:'break-all',height:this.state.height-204,overflowY:'auto',overflowX:'hidden',fontWeight:600,letterSpacing:'2px'}}>
        {markedUpGene()}
      </div>
    </div>;
    //Select target area
    const step1 = !this.state.fullGene?<li>
      <label>Step 1</label>
      <h2>Search For A Gene by Name</h2><div>{geneNameForm}</div>
    </li>:null;
    const step2 = !this.state.fullGene?null:<li>
      <label>Step 2</label>
      <div id='base-padding' class='input-wrap'>
        <i>Base Padding:</i>
        <select disabled={!this.state.fullGene?true:!this.state.potentialTargets?false:true} value={this.state.extraBases} onChange={this.baseSelector.bind(this)}>
          <option selected value='0'>0</option>
          <option value='1000'>1000</option>
          <option value='2000'>2000</option>
          <option value='3000'>3000</option>
          <option value='4000'>4000</option>
        </select>
      </div>
      <h2>Click an Area To Find Potential Targets</h2>
    </li>;
    const step3 = !this.state.potentialTargets?null:<li>
      <label>Step 3</label>
      <h2>Select From List To Find Potential Primers</h2>
      <div class='form-wrap' style={{height:this.state.height-304}}><div className='targets'>{targetList()}</div></div>
    </li>;
    const step4 = !this.state.primers?null:<li>
      <label>Step 4</label>
      <h2>Select Your Primers To Download Information</h2>
      <div class='form-wrap' style={{height:this.state.height-336}}><div className='primers'>{primerList()}</div></div>
    </li>
    const primerInfo = !this.state.allPrimers?null:<li>
      <div class='tool-box' onClick={this.showPrimerInfo.bind(this)}>
        <label>Primer Info<div style={{float:'right'}}>{!this.state.showPrimerInfo?'+':'-'}</div></label>
      </div>
      <div class='form-wrap' style={{height:!this.state.showPrimerInfo?0:this.state.height-290}}>
          <div className='primers'>{primerList()}</div>
      </div>
    </li>
    //Final Step
    const pamBox = () => {
      let targetOnly;
      let pam;
      let target;
      const strand = this.state.potentialTargets[0].strand;
      const pamStyle= {
        background:'rgba(66,237,94,0.6)',
      }
      const targetStyle = {
        background:'rgba(19,111,99,0.6)'
      }
      if(strand==='-') {
        targetOnly = this.revComp(this.state.target).slice(3);
        pam = this.revComp(this.state.target).slice(0,3);
        target = <span><span style={pamStyle}>{pam}</span><span style={targetStyle}>{targetOnly}</span></span>;
      } else {
        targetOnly = this.state.target.slice(0,this.state.target.length-3);
        pam = this.state.target.slice(this.state.target.length-3,this.state.target.length);
        target = <span><span style={targetStyle}>{targetOnly}</span><span style={pamStyle}>{pam}</span></span>;
      }
      const currentPam = !this.state.mutatedPam?<span style={pamStyle}>{this.state.fullGene.slice(this.state.pam, this.state.pam+3)}</span>:<span style={pamStyle}>{this.state.mutatedPam}</span>;
      const readingFrameNums = () => {
        let nums = [];
        let currenNum = this.state.pam-this.state.startCodon+this.state.extraBases;
        for(let i=0;i<this.state.target.length;i++) {
          nums.push((currenNum%3)+1);
          currenNum += 1;
        }
        return nums;
      }


      return <div id='panel-2' style={{width:(!mobile?Math.floor(this.state.width*(2/3)):window.innerWidth)+'px',height:this.state.height-162+'px',}}>
        <div class='pam-box'>  
          <div class='info-box'>
            <div><i>Reading Frame: </i>{((this.state.pam-this.state.startCodon+this.state.extraBases)%3)+1}</div>
            <div><i>Strand: {this.state.potentialTargets[0].strand}</i></div>
            <div><i><div style={{display:'inline-block',width:'90px'}}>Target: </div></i><span style={{position:'relative',fontFamily:'Roboto Mono'}}>{target}</span></div>
            <div style={{margin:0,fontFamily:'Roboto Mono'}}><div style={{display:'inline-block',width:'90px'}}></div>{readingFrameNums()}</div>
            <div style={{fontSize:18}}><b>Current Pam: </b><span style={{fontFamily:'Roboto Mono'}}>{currentPam}</span></div>
          </div>
          <div><img src='/img/amino_acid_chart.png' width={(!mobile?Math.floor(this.state.width*(2/3)):window.innerWidth)+'px'} /></div>
        </div>
      </div>; 
    }
    const pamInput = <div><form onSubmit={this.mutatePam.bind(this)}>
      <input type='string' maxLength='3' pattern='.{3}' placeholder='New Pam' class='prompt-input'/>
      <button>Submit</button>
    </form>
    <sub>*Only Use Three Letter Sequences</sub><br/><br/>
    <button onClick={this.mutatePam.bind(this,'')}>Clear</button>
    <br/><br/>
    </div>
    const pamInfo = <div>
      Mutated Pam: <b>{this.state.mutatedPam}</b><br/><br/>
      <button onClick={this.showPamInput.bind(this)}>Edit</button><br/><br/>
    </div>

    const plasmidOptions = () => {
      const options = this.state.plasmidOptions;
      let htmlOptions = [];
      for(let i=-1;i<this.state.plasmidOptions.length;i++){
        if(i===-1){
          htmlOptions.push(<option default>Select A Plasmid Template</option>)
        } else {
        htmlOptions.push(<option key={i} value={this.state.plasmidOptions[i]}>{this.state.plasmidOptions[i]}</option>)
        }
      }
      return htmlOptions;
    }
    const plasmidSelect = <div><select style={{height:26,margin:'12px 0px'}} onChange={this.selectPlasmidTemplate.bind(this)}>
      {plasmidOptions()}
    </select><button onClick={this.downloadPlasmid.bind(this)}>Download</button><button onClick={this.showPlasmidSelect.bind(this)}>Cancel</button></div>;
    const downloadSection = <li className='download-section'>
      <label>Final Step: Download Files</label>
      <h2>Make Some Final Adjustments before Downloading</h2>
      {!this.state.showPamInput?this.state.mutatedPam?pamInfo:<div onClick={this.showPamInput.bind(this)} className='button'>Mutate Pam</div>:pamInput}
      <div onClick={this.downloadDesignApe.bind(this)} className='button'>Download Ape File</div>
      {!this.state.showPlasmidSelect?<div onClick={this.showPlasmidSelect.bind(this)} className='button'>Download Plasmid Template</div>:plasmidSelect}
    </li>
    const toolMenu = <ul class='tool-menu' style={{display:!this.state.subMenu?'none':'block',left:!mobile?'15px':'0px'}}>
      <li><label className='button' onClick={this.saveDesign.bind(this)}>Save</label></li>
      <li>
        <label className='button'>Upload
          <input onChange={this.openDesign.bind(this)} type='file' style={{display:'none'}}></input>
        </label>
      </li>
    </ul>;
    const target = !this.state.potentialTargets?null:!this.state.potentialTargets[0].distal?null:this.state.potentialTargets[0];
    const targetInfo = !target?null:<ul style={{display:!this.state.showTargetInfo?'none':'block'}}>
      <li className='single-target'>
        <div className='target-wrapper'>
          <div style={{wordBreak:'break-all'}} className='target-gene-list'>Target Site:   
            <div style={{marginLeft:'6px',display:'inline-block',verticalAlign:'top',maxWidth:(this.state.width<210?this.state.width:210)+'px'}}>
              <b><span>{target.distal}</span><span>{target.proximal}</span><span>{target.pam}</span></b></div>
            </div>
          <div>Efficiency Score: <b>{target.score}</b></div>
          <div><ul><li>Strand: <b>{target.strand}</b></li><li>Off Targets: <b>{target.offTarget}</b></li></ul></div>
          <div>{!this.state.oligos?null:this.state.oligos[0].slice(0,this.state.oligos[0].search(':'))} 
            <b>{!this.state.oligos?null:this.state.oligos[0].slice(this.state.oligos[0].search(':'),this.state.oligos[0].length)}</b>
          </div>
          <div>{!this.state.oligos?null:this.state.oligos[1].slice(0, this.state.oligos[1].search(':'))}
            <b>{!this.state.oligos?null:this.state.oligos[1].slice(this.state.oligos[1].search(':'),this.state.oligos[1].length)}</b>
          </div>
        </div>
      </li>
    </ul>;
    const genePanel = <div id='panel-2' style={{width:(!mobile?Math.floor(this.state.width*(2/3)):window.innerWidth)+'px',height:this.state.height-162+'px'}}>
      <ul class='table-key'>
        <li><i>Intergenic Region:</i><b style={{fontFamily:'Roboto Mono',color:'rgba(8,7,8,0.4)'}}>xxx</b></li>
        <li><i>Gene Span:</i><b style={{fontFamily:'Roboto Mono',color:'rgba(8,7,8)'}}>xxx</b></li>
        <li><i>UTR:</i><b style={{fontFamily:'Roboto Mono',color:'rgb(19,111,99)'}}>XXX</b></li>
        <li><i>Coding Region:</i><b style={{fontFamily:'Roboto Mono',color:'rgb(55,114,255)'}}>XXX</b></li>
      </ul>
      <div class='gene'>{gene}</div>
    </div>
    return (
      <div className="App" onClick={!this.state.subMenu?null:this.subMenu.bind(this)}>
        <div className='loading' style={{display:!statusMessage?'none':'block'}}><h1>{statusMessage}</h1></div>
        <div className='main'>
          <div class='header'>
            <h1>{title}</h1>
          </div>
          <div id='panel-1' style={{width:(!mobile?Math.floor(this.state.width*(1/3)):window.innerWidth)+'px',height:(!mobile?this.state.height-162+'px':'auto')}}>
            <ul class='tools'>
              <li className='tool-bar'>
                <div style={{float:'left',position:'relative',cursor:'pointer'}} onClick={this.subMenu.bind(this)}>
                  <img src={toolPic} alt='Tools' style={{float:'left'}} />
                </div>
                <i>Font Size:</i> <select disabled={!this.state.fullGene?true:false} value={this.state.fontSize} onChange={this.fontSize.bind(this)}><option value='14' >14</option><option value='16' selected>16</option><option value='18' >18</option><option value='20' >20</option><option value='22' >22</option><option value='24' >24</option></select>
                {toolMenu}
              </li>
              <li>
              <div class='tool-box' onClick={this.showTargetInfo.bind(this)} style={{display:!this.state.target?'none':'block'}}>
                <label>Target Info<div style={{float:'right'}}>{!this.state.showTargetInfo?'+':'-'}</div></label>
              </div>
              {targetInfo}
              </li>
              {!this.state.allPrimers?null:primerInfo}
            </ul>
            <ul class='form'>
              {step1}
              {!this.state.potentialTargets?step2:null}
              {!this.state.primers?step3:null}
              {!this.state.allPrimers?step4:downloadSection}
            </ul>
          </div>
          {!this.state.showPamInput?genePanel:pamBox()}
        </div>
      </div>
    )
  }
}
