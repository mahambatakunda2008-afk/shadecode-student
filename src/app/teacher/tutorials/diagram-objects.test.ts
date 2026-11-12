import { describe, expect, it } from "vitest";
import { getDiagramObjectBounds, hitTestDiagramObject, moveDiagramObjectWithinCanvas, resizeDiagramObject, translateDiagramObject, validateDiagramObject, type DiagramObject } from "./diagram-objects";
const style={stroke:"#172033",fill:"none",strokeWidth:4};
const rect:DiagramObject={id:"r1",type:"rectangle",x:20,y:30,width:100,height:60,style};
describe("editable diagram object geometry",()=>{
 it("computes bounds and tests shape edges",()=>{expect(getDiagramObjectBounds(rect)).toEqual({x:20,y:30,width:100,height:60});expect(hitTestDiagramObject(rect,{x:20,y:55})).toBe(true);expect(hitTestDiagramObject(rect,{x:70,y:55})).toBe(false);});
 it("translates without mutating original",()=>{expect(translateDiagramObject(rect,15,-5)).toMatchObject({x:35,y:25});expect(rect.x).toBe(20);});
 it("clamps movement to canvas",()=>{expect(moveDiagramObjectWithinCanvas(rect,5000,5000)).toMatchObject({x:1100,y:640});expect(moveDiagramObjectWithinCanvas(rect,-5000,-5000)).toMatchObject({x:0,y:0});});
 it("resizes polygon vertices proportionally",()=>{const p:DiagramObject={id:"p",type:"polygon",points:[{x:10,y:10},{x:30,y:10},{x:20,y:30}],style};expect(resizeDiagramObject(p,{x:100,y:100,width:60,height:40})).toEqual({...p,points:[{x:100,y:100},{x:160,y:100},{x:130,y:140}]});});
 it("hit tests polygon interiors and line segments",()=>{const p:DiagramObject={id:"p",type:"polygon",points:[{x:10,y:10},{x:50,y:10},{x:30,y:40}],style},l:DiagramObject={id:"l",type:"line",from:{x:10,y:80},to:{x:100,y:80},style};expect(hitTestDiagramObject(p,{x:30,y:20})).toBe(true);expect(hitTestDiagramObject(l,{x:50,y:84})).toBe(true);expect(hitTestDiagramObject(l,{x:50,y:100})).toBe(false);});
 it("validates serialisable geometry and rejects malformed values",()=>{expect(validateDiagramObject(rect)).toBe(true);expect(validateDiagramObject({...rect,width:Number.NaN})).toBe(false);expect(validateDiagramObject({...rect,style:{...style,strokeWidth:100}})).toBe(false);expect(validateDiagramObject({id:"bad",type:"polygon",points:[],style})).toBe(false);});
});
