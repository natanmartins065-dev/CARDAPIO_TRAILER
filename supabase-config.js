// Este arquivo conecta nosso site ao Supabase.
// A URL e a chave abaixo são públicas e seguras para ficar aqui,
// pois o RLS que configuramos protege o que cada uma pode acessar.

const SUPABASE_URL = "https://bfstzsszeadcnvhqoivx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Bl45bGWm_gt7qLsFjB7caw_QKyYGYD0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CREATE_ORDER_URL = "https://bfstzsszeadcnvhqoivx.supabase.co/functions/v1/create-order";