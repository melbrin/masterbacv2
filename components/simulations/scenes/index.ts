import type { ComponentType } from "react";
import SceneBasket from "./Basket";
import SceneDoppler from "./Doppler";
import SceneLargage from "./Largage";
import SceneRadio from "./Radio";
import SceneRc from "./Rc";
import SceneSatellite from "./Satellite";
import SceneTemperature from "./Temperature";
import SceneTitrage from "./Titrage";
import type { PropsScene } from "./types";

/** La scène de chaque simulation du labo, par identifiant. */
export const SCENES: Record<string, ComponentType<PropsScene>> = {
  basket: SceneBasket,
  largage: SceneLargage,
  rc: SceneRc,
  temperature: SceneTemperature,
  doppler: SceneDoppler,
  satellite: SceneSatellite,
  titrage: SceneTitrage,
  radio: SceneRadio,
};
