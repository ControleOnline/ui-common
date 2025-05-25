<template>
  <div>
    <div>
      <input v-model="ddi" placeholder="DDI" />
      <input v-model="ddd" placeholder="DDD" />
      <input v-model="number" placeholder="Telefone" />
      <button @click="solicitarQrCode">Solicitar QR Code</button>
    </div>
    <div v-if="qrImage">
      <img :src="qrImage" alt="QR Code" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import QRCode from "qrcode";

export default {
  data() {
    return {
      ddi: "55",
      ddd: "",
      number: "",
      qrImage: null,
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      defaultCompany: "people/defaultCompany",
      companies: "people/companies",
    }),
    phone() {
      return `${this.ddi}${this.ddd}${this.number}`;
    },
  },
  methods: {
    ...mapActions({
      createWhatsappConnection: "connections/createWhatsappConnection",
    }),
    solicitarQrCode() {
      this.createWhatsappConnection({ phone: this.phone }).then((response) => {
        if (response.qr)
          QRCode.toDataURL(response.qr).then((url) => {
            this.qrImage = url;
          });
      });
    },
  },
};
</script>

<style scoped></style>
