
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "carnet": {
                  Row: {
                    "cle": string,"echeance": string,"entre_le": string,"etape": number,"rang": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cle": string,"echeance": string,"entre_le"?: string,"etape": number,"rang"?: never,"user_id": string
                  }
                  Update: {
                    "cle"?: string,"echeance"?: string,"entre_le"?: string,"etape"?: number,"rang"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"defis": {
                  Row: {
                    "defi": string,"essais": number,"etoiles": number | null,"maj_le": string,"reussi_le": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "defi": string,"essais"?: number,"etoiles"?: number | null,"maj_le"?: string,"reussi_le"?: string | null,"user_id": string
                  }
                  Update: {
                    "defi"?: string,"essais"?: number,"etoiles"?: number | null,"maj_le"?: string,"reussi_le"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"droits": {
                  Row: {
                    "cree_par": string | null,"debut": string,"fin": string | null,"id": string,"motif": string | null,"offre": string,"origine": string,"reference": string | null,"retire_le": string | null,"retire_motif": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cree_par"?: string | null,"debut"?: string,"fin"?: string | null,"id"?: string,"motif"?: string | null,"offre": string,"origine": string,"reference"?: string | null,"retire_le"?: string | null,"retire_motif"?: string | null,"user_id": string
                  }
                  Update: {
                    "cree_par"?: string | null,"debut"?: string,"fin"?: string | null,"id"?: string,"motif"?: string | null,"offre"?: string,"origine"?: string,"reference"?: string | null,"retire_le"?: string | null,"retire_motif"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"droits_en_attente": {
                  Row: {
                    "adresse": string,"cree_le": string,"cree_par": string | null,"fin": string | null,"id": string,"motif": string | null,"offre": string,"reclame_le": string | null,"reclame_par": string | null,"reference": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adresse": string,"cree_le"?: string,"cree_par"?: string | null,"fin"?: string | null,"id"?: string,"motif"?: string | null,"offre": string,"reclame_le"?: string | null,"reclame_par"?: string | null,"reference"?: string | null
                  }
                  Update: {
                    "adresse"?: string,"cree_le"?: string,"cree_par"?: string | null,"fin"?: string | null,"id"?: string,"motif"?: string | null,"offre"?: string,"reclame_le"?: string | null,"reclame_par"?: string | null,"reference"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"ds": {
                  Row: {
                    "cree_le": string,"cree_le_jour": string,"duree": number,"fiches": (number)[],"format": string,"id": string,"jour_devoir": string,"moyenne_classe": number | null,"note": number | null,"objectif": number,"offert": boolean,"seances": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cree_le"?: string,"cree_le_jour": string,"duree": number,"fiches": (number)[],"format": string,"id"?: string,"jour_devoir": string,"moyenne_classe"?: number | null,"note"?: number | null,"objectif": number,"offert"?: boolean,"seances": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "cree_le"?: string,"cree_le_jour"?: string,"duree"?: number,"fiches"?: (number)[],"format"?: string,"id"?: string,"jour_devoir"?: string,"moyenne_classe"?: number | null,"note"?: number | null,"objectif"?: number,"offert"?: boolean,"seances"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"journal_audit": {
                  Row: {
                    "acteur": string | null,"action": string,"cible": string | null,"cree_le": string,"detail": Json | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acteur"?: string | null,"action": string,"cible"?: string | null,"cree_le"?: string,"detail"?: Json | null,"id"?: never
                  }
                  Update: {
                    "acteur"?: string | null,"action"?: string,"cible"?: string | null,"cree_le"?: string,"detail"?: Json | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"limites": {
                  Row: {
                    "cle": string,"compteur": number,"fenetre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cle": string,"compteur"?: number,"fenetre": string
                  }
                  Update: {
                    "cle"?: string,"compteur"?: number,"fenetre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"parties": {
                  Row: {
                    "cree_le": string,"fiches": (number)[],"id": string,"jeu": string,"score": number,"secondes": number,"user_id": string,"verifiee": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "cree_le"?: string,"fiches": (number)[],"id"?: string,"jeu": string,"score": number,"secondes": number,"user_id": string,"verifiee"?: boolean
                  }
                  Update: {
                    "cree_le"?: string,"fiches"?: (number)[],"id"?: string,"jeu"?: string,"score"?: number,"secondes"?: number,"user_id"?: string,"verifiee"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"passages": {
                  Row: {
                    "fiche": number,"niveau": number,"reussi_le": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "fiche": number,"niveau": number,"reussi_le"?: string,"user_id": string
                  }
                  Update: {
                    "fiche"?: number,"niveau"?: number,"reussi_le"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profils": {
                  Row: {
                    "classe": string,"cree_le": string,"ds_offertes": number,"etat": string,"note_visee": number,"prenom": string,"quinze_ans_ou_plus": boolean,"rappels": boolean,"role": string,"specialites": (string)[],"theme": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "classe"?: string,"cree_le"?: string,"ds_offertes"?: number,"etat"?: string,"note_visee"?: number,"prenom": string,"quinze_ans_ou_plus": boolean,"rappels"?: boolean,"role"?: string,"specialites"?: (string)[],"theme"?: string,"user_id": string
                  }
                  Update: {
                    "classe"?: string,"cree_le"?: string,"ds_offertes"?: number,"etat"?: string,"note_visee"?: number,"prenom"?: string,"quinze_ans_ou_plus"?: boolean,"rappels"?: boolean,"role"?: string,"specialites"?: (string)[],"theme"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quiz_sessions": {
                  Row: {
                    "bonnes": number | null,"debut": string,"fiche": number | null,"genre": string,"id": string,"limite": string | null,"niveau": number | null,"questions": (string)[],"reponses": NonNullable<Json>,"secret": NonNullable<Json>,"termine_le": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bonnes"?: number | null,"debut"?: string,"fiche"?: number | null,"genre": string,"id"?: string,"limite"?: string | null,"niveau"?: number | null,"questions": (string)[],"reponses"?: NonNullable<Json>,"secret"?: NonNullable<Json>,"termine_le"?: string | null,"user_id": string
                  }
                  Update: {
                    "bonnes"?: number | null,"debut"?: string,"fiche"?: number | null,"genre"?: string,"id"?: string,"limite"?: string | null,"niveau"?: number | null,"questions"?: (string)[],"reponses"?: NonNullable<Json>,"secret"?: NonNullable<Json>,"termine_le"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"seances_du_jour": {
                  Row: {
                    "ds_id": string | null,"etape": number,"exercice": string | null,"faite": boolean,"jour": string,"raison": string,"revoir": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ds_id"?: string | null,"etape"?: number,"exercice"?: string | null,"faite"?: boolean,"jour": string,"raison": string,"revoir": (string)[],"user_id": string
                  }
                  Update: {
                    "ds_id"?: string | null,"etape"?: number,"exercice"?: string | null,"faite"?: boolean,"jour"?: string,"raison"?: string,"revoir"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seances_du_jour_ds_id_fkey"
      columns: ["ds_id"]
isOneToOne: false
      referencedRelation: "ds"
      referencedColumns: ["id"]
    }
                  ]
                },"signalements": {
                  Row: {
                    "cree_le": string,"etat": string,"id": string,"message": string,"ou": string,"reference": string,"reponse": string | null,"traite_le": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cree_le"?: string,"etat"?: string,"id"?: string,"message": string,"ou": string,"reference": string,"reponse"?: string | null,"traite_le"?: string | null,"user_id": string
                  }
                  Update: {
                    "cree_le"?: string,"etat"?: string,"id"?: string,"message"?: string,"ou"?: string,"reference"?: string,"reponse"?: string | null,"traite_le"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tentatives": {
                  Row: {
                    "cle": string,"contexte": string,"cree_le": string,"detail": Json | null,"id": number,"resultat": string,"score": number,"user_id": string,"version_contenu": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cle": string,"contexte"?: string,"cree_le"?: string,"detail"?: Json | null,"id"?: never,"resultat": string,"score": number,"user_id": string,"version_contenu"?: number | null
                  }
                  Update: {
                    "cle"?: string,"contexte"?: string,"cree_le"?: string,"detail"?: Json | null,"id"?: never,"resultat"?: string,"score"?: number,"user_id"?: string,"version_contenu"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"vu_en_classe": {
                  Row: {
                    "coche_le": string,"fiche": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coche_le"?: string,"fiche": number,"user_id": string
                  }
                  Update: {
                    "coche_le"?: string,"fiche"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "adresses_des_comptes":
{ Args: { "p_ids": (string)[] }; Returns: Json
                           },
"compte_par_adresse":
{ Args: { "p_adresse": string }; Returns: Json
                           },
"contenu_fiche":
{ Args: { "p_num": number }; Returns: Json
                           },
"contenu_figure":
{ Args: { "p_chemin": string }; Returns: Json
                           },
"contenu_importe":
{ Args: { "p": Json }; Returns: Json
                           },
"contenu_items":
{ Args: { "p_cles": (string)[] }; Returns: Json
                           },
"contenu_quiz":
{ Args: { "p_ids": (string)[] }; Returns: Json
                           },
"contenu_sommaire":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"droits_reclame":
{ Args: { "p_user": string }; Returns: number
                           },
"ds_offerte_consomme":
{ Args: { "p_user": string }; Returns: boolean
                           },
"est_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"limite_consomme":
{ Args: { "p_cle": string,"p_max": number,"p_secondes": number }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
