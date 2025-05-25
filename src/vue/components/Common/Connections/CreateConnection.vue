<template>
  <div>
    <div>
      <input v-model="ddi" placeholder="DDI" />
      <input v-model="ddd" placeholder="DDD" />
      <input v-model="phone" placeholder="Telefone" />
      <button @click="startQrInterval">Solicitar QR Code</button>
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
      phone: "",
      qrImage: null,
      qrInterval: null,
    };
  },
  props: {
    row: {
      default: {},
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      defaultCompany: "people/defaultCompany",
      companies: "people/companies",
    }),
    completePhone() {
      return `${this.ddi}${this.ddd}${this.phone}`;
    },
  },
  created() {
    this.ddd = this.row?.phone?.ddd;
    this.phone = this.row?.phone?.phone;
    if (this.row) this.startQrInterval();
    console.log(this.row);
  },
  methods: {
    ...mapActions({
      createWhatsappConnection: "connections/createWhatsappConnection",
    }),

    getQrCode() {
      this.createWhatsappConnection({ phone: this.completePhone }).then(
        (response) => {
          if (response.status === "CONNECTED") this.$emit("saved");
          if (response.qr)
            QRCode.toDataURL(response.qr).then((url) => {
              this.qrImage = url;
            });
        }
      );
    },
    startQrInterval() {
      clearInterval(this.qrInterval);
      this.getQrCode();
      this.qrInterval = setInterval(this.getQrCode, 5000);
    },
  },
  beforeUnmount() {
    if (this.qrInterval) clearInterval(this.qrInterval);
  },
};
</script>
